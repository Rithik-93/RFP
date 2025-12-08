import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function parseRFPFromChat(chatMessage: string) {
    const prompt = `You are an AI assistant helping with procurement. Extract RFP details from this message:

"${chatMessage}"

Extract and return JSON with:
- title: brief title
- description: full description
- requirements: array of requirement objects {name, description, quantity?, specifications?}
- budget: total budget number (no currency symbol)
- currency: currency code (USD/INR/etc)
- deliveryDeadline: ISO date string
- paymentTerms: payment terms if mentioned

If something is not mentioned, use null. Be smart about inferring reasonable values.

Return ONLY valid JSON, no markdown formatting.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Remove markdown code blocks if present
        const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonText);

        return {
            success: true,
            data: parsed
        };
    } catch (error: any) {
        console.error('Gemini parsing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export async function parseVendorProposal(emailContent: string, rfpContext: any) {
    const prompt = `You are analyzing a vendor's proposal email for an RFP.

RFP Details:
${JSON.stringify(rfpContext, null, 2)}

Vendor Email:
"${emailContent}"

Extract and return JSON with:
- pricing: {total: number, breakdown: array of {item, unitPrice, quantity, subtotal}}
- deliveryTimeline: delivery date or days
- paymentTerms: their payment terms
- warranty: warranty details
- terms: any special terms/conditions
- completeness: score 0-100 how complete the proposal is
- risks: array of potential risks or red flags

Return ONLY valid JSON, no markdown.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonText);

        return {
            success: true,
            data: parsed
        };
    } catch (error: any) {
        console.error('Gemini proposal parsing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export async function generateRecommendation(proposals: any[], rfp: any) {
    const prompt = `You are a procurement expert. Analyze these vendor proposals and recommend the best one.

RFP: ${rfp.title}
Budget: ${rfp.currency} ${rfp.budget}

Proposals:
${JSON.stringify(proposals, null, 2)}

Provide recommendation as JSON:
- recommendedVendor: vendor ID
- score: 0-100 overall score
- reasoning: detailed reasoning (2-3 sentences)
- prosAndCons: {pros: string[], cons: string[]} for each vendor
- riskAssessment: overall risk level (LOW/MEDIUM/HIGH)

Return ONLY valid JSON.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonText);

        return {
            success: true,
            data: parsed
        };
    } catch (error: any) {
        console.error('Gemini recommendation error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
