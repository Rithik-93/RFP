import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { functionDeclarations, executeFunction } from './functions';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT || 3003;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ai-service' });
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

        const historyText = history.length > 0
            ? '\n\nCHAT HISTORY:\n' + history.map((msg: any) =>
                `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n')
            : '';

        const fullPrompt = `You are an AI assistant for RFP management with access to these tools:

${toolDescriptions}

CRITICAL INSTRUCTIONS:
1. When you need data from a tool, respond with JSON: {"type": "tool_call", "tool": "toolName", "args": {...}}
2. When giving final answer to user, respond with JSON: {"type": "response", "message": "your message here"}
3. NEVER make up data - always use tools to get real information
4. Be conversational and helpful in your final responses
5. Extract structured data from natural language when creating RFPs or vendors

CRITICAL: Your response will be parsed with JSON.parse(). Do NOT wrap it in markdown code blocks. Just return the raw JSON object.

Examples:
User: "Show me all vendors"
You: {"type": "tool_call", "tool": "listVendors", "args": {}}

User: "Add vendor Acme Corp, email acme@example.com"
You: {"type": "tool_call", "tool": "createVendors", "args": {"vendors": [{"name": "Acme Corp", "email": "acme@example.com"}]}}

User: "Add vendors Apple and Microsoft with emails apple@example.com and microsoft@example.com"
You: {"type": "tool_call", "tool": "createVendors", "args": {"vendors": [{"name": "Apple", "email": "apple@example.com"}, {"name": "Microsoft", "email": "microsoft@example.com"}]}}

User: "Create RFP for laptops, budget 100k INR, deadline Dec 31, send to dell@gmail.com"
You: {"type": "tool_call", "tool": "createRFPs", "args": {"rfps": [{"title": "Laptop Procurement", "description": "...", "budget": 100000, "currency": "INR", "deliveryDeadline": "2023-12-31T23:59:59Z", "vendorEmails": ["dell@gmail.com"]}]}}

REMINDER: Return ONLY the JSON object. No markdown, no code blocks, no explanation.
${historyText}

CURRENT USER MESSAGE: ${message}

Respond with JSON only:`;

        let finalReply: any = null;
        let maxIterations = 10;

        for (let i = 0; i < maxIterations; i++) {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    contents: [{
                        role: 'user',
                        parts: [{ text: fullPrompt }]
                    }]
                },
                { headers: { 'Content-Type': 'application/json' } }
            );

            const candidate = response.data.candidates?.[0];
            if (!candidate) {
                console.log('No candidate');
                break;
            }

            let aiText = candidate.content.parts[0]?.text || '';

            aiText = aiText.trim();
            if (aiText.startsWith('```json')) {
                aiText = aiText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (aiText.startsWith('```')) {
                aiText = aiText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            let aiResponse;
            try {
                aiResponse = JSON.parse(aiText);
            } catch (e) {
                try {
                    const escapedText = aiText.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                    aiResponse = JSON.parse(escapedText);
                } catch (e2) {
                    aiResponse = { type: 'response', message: aiText };
                }
            }

            console.log(`[${i + 1}] type=${aiResponse.type}`);

            if (aiResponse.type === 'tool_call') {
                console.log(`Executing: ${aiResponse.tool}`, aiResponse.args);
                const toolResult = await executeFunction(aiResponse.tool, aiResponse.args || {});
                console.log(`Result:`, toolResult);

                history.push({ role: 'assistant', content: JSON.stringify(aiResponse) });
                history.push({ role: 'user', content: `Tool result: ${JSON.stringify(toolResult)}` });

                const newHistoryText = '\n\nCHAT HISTORY:\n' + history.map((msg: any) =>
                    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
                ).join('\n');

                const newPrompt = `You are an AI assistant for RFP management with access to these tools:

${toolDescriptions}

CRITICAL INSTRUCTIONS:
1. When you need data from a tool, respond with JSON: {"type": "tool_call", "tool": "toolName", "args": {...}}
2. When giving final answer to user, respond with JSON: {"type": "response", "message": "your message here"}
3. NEVER make up data - always use tools to get real information
4. Be conversational and helpful in your final responses

CRITICAL: Your response will be parsed with JSON.parse(). Do NOT wrap it in markdown code blocks. Just return the raw JSON object.

IMPORTANT: Your response must ONLY be valid JSON. Start with "{" and end with "}". No other text.
${newHistoryText}

Now provide a friendly response to the user about the tool result with type "response".

Respond with JSON only:`;

                const nextResponse = await axios.post(
                    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        contents: [{
                            role: 'user',
                            parts: [{ text: newPrompt }]
                        }]
                    },
                    { headers: { 'Content-Type': 'application/json' } }
                );

                const nextCandidate = nextResponse.data.candidates?.[0];
                if (!nextCandidate) break;

                let nextText = nextCandidate.content.parts[0]?.text || '';

                nextText = nextText.trim();
                if (nextText.startsWith('```json')) {
                    nextText = nextText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (nextText.startsWith('```')) {
                    nextText = nextText.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }

                try {
                    aiResponse = JSON.parse(nextText);
                } catch (e) {
                    try {
                        const escapedNext = nextText.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                        aiResponse = JSON.parse(escapedNext);
                    } catch (e2) {
                        aiResponse = { type: 'response', message: nextText };
                    }
                }
            }

            if (aiResponse.type === 'response') {
                finalReply = aiResponse;
                console.log('Final:', finalReply.message);
                break;
            }
        }

        if (!finalReply) {
            finalReply = { type: 'response', message: 'I apologize, but I was unable to generate a response.' };
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

app.listen(PORT, () => {
    console.log(`AI Service running on port ${PORT}`);
});
