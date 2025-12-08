import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { functionDeclarations, executeFunction } from './functions';
import { gmailWebhook } from './webhook';

dotenv.config({ path: '../../.env' });

// Validate required environment variables
const requiredEnvVars: string[] = ['GEMINI_API_KEY', 'ENGINE_PORT', 'ENGINE_URL'];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`ERROR: Missing required environment variable: ${envVar}`);
        console.error(`Please add ${envVar} to your .env file`);
        process.exit(1);
    }
}


const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'engine' });
});

/*
Gmail webhook endpoint for Pub/Sub gmail notifications
*/
app.post('/webhook', gmailWebhook);

/*
Email sending endpoint (called by gateway)
*/
app.post('/api/send-rfp', async (req, res) => {
    try {
        const { rfpId, vendorEmails } = req.body;

        if (!rfpId || !vendorEmails) {
            return res.status(400).json({ error: 'rfpId and vendorEmails required' });
        }

        const { sendRFPToVendors } = await import('./email');

        const vendors = await import('@rfp/database').then(m => m.prisma.vendor.findMany({
            where: { email: { in: vendorEmails } }
        }));

        const vendorIds = vendors.map(v => v.id);
        const result = await sendRFPToVendors(rfpId, vendorIds);

        res.json(result);
    } catch (error: any) {
        console.error('Send RFP error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const toolDescriptions = functionDeclarations.map(fn =>
            `- ${fn.name}: ${fn.description}\n  Parameters: ${JSON.stringify(fn.parameters.properties)}`
        ).join('\n');

        const systemPrompt = `You are an AI assistant for RFP management you'll be talking to a non-technical user and you have access to these tools:

${toolDescriptions}

CRITICAL INSTRUCTIONS:
1. When you need data from a tool, respond with JSON: {"type": "tool_call", "tool": "toolName", "args": {...}}
2. When giving final answer to user, respond with JSON: {"type": "response", "message": "your message here"}
3. NEVER make up data or halucinate - always use tools to get real information
4. Be conversational and helpful in your final responses
5. Extract structured data from natural language when creating RFPs or vendors

CONTEXT AWARENESS:
- Track RFP IDs mentioned in conversation history
- If user refers to "this RFP" or "the RFP", check recent history for RFP IDs
- When user just created an RFP, remember its ID for follow-up questions
- If unclear which RFP, list active RFPs and ask user to clarify

RFP CREATION WORKFLOW:
1. After creating RFP with createRFPs, IMMEDIATELY:
   - Show the created RFP details (title, budget, requirements)
   - Ask user "Would you like me to generate an email preview to send to vendors?"
   - Wait for user confirmation before proceeding
2. When user confirms, use generateRFPEmailPreview to show email preview
   - This automatically includes negotiation insights from past successful deals with the vendor
   - Show the email preview to the user
3. User can now:
   - Approve and send: "Looks good, send it" → use sendRFPEmailApproved with the preview body
   - Request changes: "Make it more formal" → call generateRFPEmailPreview again with customMessage
   - Modify specific parts: "Add a section about delivery" → regenerate with updated content
4. Only send when user explicitly approves

SMART DEFAULTS:
- When user asks about proposals without specifying RFP, call listRFPs first to show options
- When evaluating proposals, extract rfpId from recent context or ask which RFP
- For status updates, if only one proposal/RFP in recent context, use that ID

CRITICAL: Your response will be parsed with JSON.parse(). Do NOT wrap it in markdown. Just return raw JSON.

Examples:
User: "Show me all vendors"
You: {"type": "tool_call", "tool": "listVendors", "args": {}}

User: "Create RFP for laptops, budget 100k INR, deadline Dec 31"
You: {"type": "tool_call", "tool": "createRFPs", "args": {"rfps": [{"title": "Laptop Procurement", "description": "...", "budget": 100000, "currency": "INR", "deliveryDeadline": "2023-12-31T23:59:59Z"}]}}
[After tool returns] {"type": "response", "message": "Created RFP 'Laptop Procurement' with budget INR 100,000. Would you like to send this to vendors? I can show you an email preview first."}

User: "Show me the proposals" (no RFP specified)
You: {"type": "tool_call", "tool": "listRFPs", "args": {}}
[Then list RFPs and ask which one]

REMINDER: Return ONLY JSON. No markdown, no code blocks.`;


        // Working conversation for this request
        const workingConversation = [...history];
        workingConversation.push({ role: 'user', content: message });

        const maxIterations = 10;
        let finalReply: any = null;

        for (let i = 0; i < maxIterations; i++) {
            // Build conversation history text
            const historyText = workingConversation.map((msg: any) =>
                `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n');

            // Single combined prompt
            const promptText = `${systemPrompt}

CONVERSATION HISTORY:
${historyText}

Respond with JSON only:`;

            // Single API call
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    contents: [{
                        role: 'user',
                        parts: [{ text: promptText }]
                    }]
                },
                { headers: { 'Content-Type': 'application/json' } }
            );

            const candidate = response.data.candidates?.[0];
            if (!candidate) {
                console.log('No candidate returned from API');
                break;
            }

            let aiText = candidate.content.parts[0]?.text?.trim() || '';

            // Remove markdown code blocks if present
            if (aiText.startsWith('```json')) {
                aiText = aiText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (aiText.startsWith('```')) {
                aiText = aiText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            let aiResponse;
            try {
                aiResponse = JSON.parse(aiText);
            } catch (parseError) {
                // Fallback: treat as plain text response
                console.warn('Failed to parse AI response as JSON:', aiText.substring(0, 100));
                aiResponse = { type: 'response', message: aiText };
            }

            console.log(`[Iteration ${i + 1}] Type: ${aiResponse.type}`);

            if (aiResponse.type === 'tool_call') {
                console.log(`Executing tool: ${aiResponse.tool}`, aiResponse.args);

                const toolResult = await executeFunction(aiResponse.tool, aiResponse.args || {});
                console.log(`Tool result:`, toolResult);

                workingConversation.push({
                    role: 'assistant',
                    content: JSON.stringify(aiResponse)
                });
                workingConversation.push({
                    role: 'user',
                    content: `Tool result: ${JSON.stringify(toolResult)}`
                });

                // Continue loop to get response based on tool result
                continue;
            }

            // Handle final response
            if (aiResponse.type === 'response') {
                finalReply = aiResponse;
                console.log('Final response:', finalReply.message);
                break;
            }

            console.warn('Unknown response type:', aiResponse.type);
            finalReply = {
                type: 'response',
                message: aiResponse.message || JSON.stringify(aiResponse)
            };
            break;
        }

        if (!finalReply) {
            console.error('Max iterations reached without final response');
            finalReply = {
                type: 'response',
                message: 'I apologize, but I was unable to complete your request. Please try rephrasing your question.'
            };
        }

        res.json(finalReply);

    } catch (error: any) {
        const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
        console.error('Chat error:', errorMsg);
        res.status(500).json({
            type: 'error',
            message: 'Failed to process message',
            error: errorMsg
        });
    }
});

app.post('/api/process-email-reply', async (req, res) => {
    try {
        const { emailMessageId, inReplyTo, from, subject, body, attachments = [] } = req.body;

        const { prisma } = await import('@rfp/database');
        const fs = await import('fs');

        const existingReply = await prisma.rFPReply.findUnique({
            where: { emailMessageId }
        });

        if (existingReply) {
            console.log(`Email ${emailMessageId} already processed, skipping`);
            return res.json({
                success: true,
                skipped: true,
                message: 'Email already processed'
            });
        }

        const rfpVendor = await prisma.rFPVendor.findFirst({
            where: {
                vendor: { email: from.match(/<(.+)>/)?.[1] || from },
                sentMessageId: inReplyTo || undefined
            },
            include: { rfp: true, vendor: true }
        });

        if (!rfpVendor) {
            console.log(`No matching RFPVendor for email from ${from}`);
            return res.status(404).json({ error: 'No matching RFP found for this email' });
        }

        // Save raw email as RFPReply
        const reply = await prisma.rFPReply.create({
            data: {
                rfpVendorId: rfpVendor.id,
                emailMessageId,
                inReplyTo: inReplyTo || '',
                from,
                subject,
                body,
                type: 'PENDING',
                files: attachments.map((a: any) => a.filepath)
            }
        });

        const parts: any[] = [];

        parts.push({
            text: `You are analyzing a vendor's response to an RFP. Extract ALL relevant information from the email and any attachments.

            RFP Details:
            - Title: ${rfpVendor.rfp.title}
            - Description: ${rfpVendor.rfp.description}
            - Budget: ${rfpVendor.rfp.currency} ${rfpVendor.rfp.budget}

            Email:
            Subject: ${subject}
            From: ${from}
            Body: ${body}

            ${attachments.length > 0 ? `This email has ${attachments.length} attachment(s). Analyze them for pricing, terms, specifications, and other proposal details.` : ''}

            Extract and return JSON with:
            {
            "type": "PROPOSAL" | "QUESTION" | "DECLINE" | "OTHER",
            "data": {
                // Financial / pricing information (if provided)
                "pricing"?: {
                "currency": string,
                "total": number,
                "breakdown"?: [
                    { "item": string, "cost": number }
                ],
                "notes"?: string   // e.g. “Plus taxes and shipping”
                },

                // Delivery / timeline information
                "timeline"?: {
                "delivery"?: string,     // e.g. “4 weeks after PO”, “By 2025-12-31”
                "validity"?: string        // e.g. “Offer valid for 30 days”
                },

                // Terms and conditions (these are just examples! if non of these are mentioned, don't even add the KV only add if you found any spec!)
                "terms"?: {
                "payment"?: string,       // e.g. “Net 30”, “50% advance, 50% on delivery”
                "warranty"?: string,      // e.g. “1 year on parts and labor”
                "support"?: string,       // e.g. “24x7 phone support for 2 years”
                "delivery"?: string,      // e.g. “Ex-works Hyderabad”, “DDP Bangalore”
                "other"?: string          // any other contractual term, e.g. license terms, maintenance, penalties
                },

                // Specifications / scope of supply / technical details
                "specifications"?: object,  // a nested object capturing details like {ram: 16, ssd: 512, gpu: "4GB", etc.}, or service scope

                // Attachments metadata
                "attachments"?: [
                { "filename": string, "mimeType": string, "notes"?: string }
                ],

                // Any clarifications, questions, exceptions, deviations, assumptions
                "notes"?: string,

                // A brief summary (1-3 sentences) of what vendor is offering / asking
                "summary": string
            }
            }

            CRITICAL RULES:
            1. Return ONLY valid JSON. No markdown, no explanation.
            2. OMIT fields that don't have values (don't set them to null).
            3. For DECLINE/QUESTION types, usually only "summary" is needed.`
        });

        // Add attachments (images and PDFs)
        for (const attachment of attachments) {
            try {
                const { filepath, mimeType } = attachment;

                // Read file as base64
                const fileBuffer = fs.readFileSync(filepath);
                const base64Data = fileBuffer.toString('base64');

                // Gemini supports images and PDFs directly
                if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
                    parts.push({
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    });
                    console.log(`Added attachment to Gemini: ${attachment.filename} (${mimeType})`);
                }
            } catch (error) {
                console.error(`Error reading attachment ${attachment.filename}:`, error);
            }
        }

        // Call Gemini 2.5 Flash with multimodal content (supports PDFs and images)
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [{ role: 'user', parts }]
            }
        );

        let aiResult;
        const aiText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleanText = aiText.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');

        try {
            aiResult = JSON.parse(cleanText);
            console.log(`AI Classification: ${aiResult.type}`);
        } catch (parseError) {
            console.error('Failed to parse AI response:', cleanText);
            aiResult = { type: 'OTHER', data: null };
        }

        await prisma.rFPReply.update({
            where: { id: reply.id },
            data: {
                type: aiResult.type,
                parsedData: aiResult.data
            }
        });
        console.log(`Saved RFPReply (type: ${aiResult.type})`);

        if (aiResult.type === 'PROPOSAL' && aiResult.data) {
            const proposalData = aiResult.data;

            await prisma.proposal.create({
                data: {
                    rfpId: rfpVendor.rfpId,
                    vendorId: rfpVendor.vendorId,
                    rfpReplyId: reply.id,
                    rawEmailContent: body,
                    parsedData: proposalData,
                    attachments: attachments.map((a: any) => ({
                        filename: a.filename,
                        mimeType: a.mimeType,
                        size: a.size,
                        filepath: a.filepath
                    })),
                    status: 'RECEIVED'
                }
            });

            await prisma.rFPVendor.update({
                where: { id: rfpVendor.id },
                data: { status: 'RESPONDED', respondedAt: new Date() }
            });

            console.log(`Created Proposal from ${from} (${attachments.length} attachments)`);
        } else {
            console.log(`Email is ${aiResult.type}, no Proposal created (only RFPReply)`);
        }

        console.log(`Processed email ${emailMessageId}: ${aiResult.type}`);
        res.json({
            success: true,
            type: aiResult.type,
            data: aiResult.data,
            attachmentCount: attachments.length
        });
    } catch (error: any) {
        console.error('Process email error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Engine running on port ${PORT}`);
});
