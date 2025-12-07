import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

import { prisma } from '@rfp/database';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3001;

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3003';
const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://localhost:3004';

app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'gateway' });
});

app.post('/api/conversations', async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'message required' });
        }

        const conversation = await prisma.conversation.create({
            data: {
                title: message.substring(0, 50)
            }
        });

        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: 'user',
                content: message
            }
        });

        const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/chat`, {
            message,
            history: []
        });

        const aiResult = await aiResponse.data;

        if (!aiResult.message || aiResult.type !== 'response') {
            console.error('AI service returned invalid response:', aiResult);
            return res.status(500).json({ error: 'AI service failed to generate a response' });
        }

        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: 'assistant',
                content: aiResult.message
            }
        });

        res.json({
            conversationId: conversation.id,
            reply: aiResult.message
        });
    } catch (error: any) {
        console.error('Create conversation error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        if (!message || !req.params.id) {
            return res.status(400).json({ error: 'message and conversationId required' });
        }

        // Load conversation history
        const messages = await prisma.message.findMany({
            where: { conversationId: req.params.id },
            orderBy: { createdAt: 'asc' }
        });

        // Create user message
        await prisma.message.create({
            data: {
                conversationId: req.params.id,
                role: 'user',
                content: message
            }
        });

        // Build history for AI
        const history = messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        // Call AI with full history
        const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/chat`, {
            message,
            history
        });

        const aiResult = await aiResponse.data;

        if (!aiResult.message || aiResult.type !== 'response') {
            console.error('AI service returned invalid response:', aiResult);
            return res.status(500).json({ error: 'AI service failed to generate a response' });
        }

        // Save AI response
        await prisma.message.create({
            data: {
                conversationId: req.params.id,
                role: 'assistant',
                content: aiResult.message
            }
        });

        res.json({ reply: aiResult.message });
    } catch (error: any) {
        console.error('Add message error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get conversation with messages
app.get('/api/conversations/:id', async (req: Request, res: Response) => {
    if (!req.params.id) {
        return res.status(400).json({ error: 'conversationId required' });
    }
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: req.params.id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json(conversation);
    } catch (error: any) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/rfps/direct', async (req: Request, res: Response) => {
    try {
        const { title, description, requirements, budget, currency, deliveryDeadline, paymentTerms, createdBy } = req.body;

        if (!title || !description || !budget || !deliveryDeadline) {
            return res.status(400).json({ error: 'title, description, budget, and deliveryDeadline required' });
        }

        const rfp = await prisma.rFP.create({
            data: {
                title,
                description,
                requirements: requirements || [],
                budget: parseFloat(budget),
                currency: currency || 'USD',
                deliveryDeadline: new Date(deliveryDeadline),
                paymentTerms: paymentTerms || undefined,
                createdBy: createdBy || undefined,
                status: 'DRAFT',
            },
        });

        res.json({ success: true, rfp });
    } catch (error: any) {
        console.error('Direct create RFP error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rfps', async (req: Request, res: Response) => {
    try {
        const { message, createdBy } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'message required' });
        }

        // Call AI service to parse RFP
        const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/parse-rfp`, {
            message
        });

        const aiResult = await aiResponse.data;

        if (!aiResult.success) {
            return res.status(400).json({ error: 'Failed to parse RFP', details: aiResult.error });
        }

        const parsed = aiResult.data;

        // Create RFP in database
        const rfp = await prisma.rFP.create({
            data: {
                title: parsed.title,
                description: parsed.description,
                requirements: parsed.requirements || [],
                budget: parsed.budget,
                currency: parsed.currency || 'USD',
                deliveryDeadline: new Date(parsed.deliveryDeadline),
                paymentTerms: parsed.paymentTerms,
                createdBy: createdBy || undefined,
                status: 'DRAFT',
            },
        });

        res.json({ success: true, rfp });
    } catch (error: any) {
        console.error('Create RFP error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/rfps', async (req: Request, res: Response) => {
    try {
        const rfps = await prisma.rFP.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(rfps);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/proposals', async (req: Request, res: Response) => {
    try {
        const { rfpId } = req.query;
        const proposals = await prisma.proposal.findMany({
            where: rfpId ? { rfpId: rfpId as string } : {},
            include: { vendor: true, rfp: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(proposals);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single RFP with proposals
app.get('/api/rfps/:id', async (req: Request, res: Response) => {

    const id = req.params.id;
    if (!id) {
        return res.status(400).json({ error: 'id required' });
    }
    try {
        const rfp = await prisma.rFP.findUnique({
            where: { id },
            include: {
                proposals: {
                    include: {
                        vendor: true,
                    },
                },
                vendors: {
                    include: {
                        vendor: true,
                    },
                },
            },
        });

        if (!rfp) {
            return res.status(404).json({ error: 'RFP not found' });
        }

        res.json(rfp);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rfps/:id/send', async (req: Request, res: Response) => {
    try {
        const { vendorEmails } = req.body;
        if (!vendorEmails || !Array.isArray(vendorEmails) || !req.params.id) {
            return res.status(400).json({ error: 'vendorEmails array required' });
        }
        const rfp = await prisma.rFP.findUnique({ where: { id: req.params.id } });
        if (!rfp) {
            return res.status(404).json({ error: 'RFP not found' });
        }
        const vendors = await prisma.vendor.findMany({
            where: { email: { in: vendorEmails } }
        });
        const emailResponse = await axios.post(`${EMAIL_SERVICE_URL}/api/send`, {
            to: vendorEmails,
            subject: `RFP: ${rfp.title}`,
            body: `${rfp.description}\n\nBudget: ${rfp.budget} ${rfp.currency}\nDeadline: ${rfp.deliveryDeadline}`
        });
        const emailResult = await emailResponse.data;
        res.json({ success: true, emailResult });
    } catch (error: any) {
        console.error('Send RFP error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send RFP to vendors
app.post('/api/rfps/:id/send', async (req: Request, res: Response) => {
    try {
        const { vendorIds } = req.body;

        if (!vendorIds || !Array.isArray(vendorIds)) {
            return res.status(400).json({ error: 'vendorIds array required' });
        }

        // Call email service
        const emailResponse = await axios.post(`${EMAIL_SERVICE_URL}/api/send-rfp`, {
            rfpId: req.params.id,
            vendorIds
        });

        const result = await emailResponse.data;
        res.json(result);
    } catch (error: any) {
        console.error('Send RFP error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== VENDOR ENDPOINTS ==========

// Create vendor
app.post('/api/vendors', async (req: Request, res: Response) => {
    try {
        const { name, email, phone, address } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'name and email required' });
        }

        const vendor = await prisma.vendor.create({
            data: {
                name,
                email,
                phone: phone || undefined,
                address: address || undefined,
            },
        });

        res.json({ success: true, vendor });
    } catch (error: any) {
        console.error('Create vendor error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all vendors
app.get('/api/vendors', async (req: Request, res: Response) => {
    try {
        const vendors = await prisma.vendor.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(vendors);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ========== PROPOSAL ENDPOINTS ==========

// Submit proposal (vendor response)
app.post('/api/proposals', async (req: Request, res: Response) => {
    try {
        const { rfpId, vendorId, emailContent } = req.body;

        if (!rfpId || !vendorId || !emailContent) {
            return res.status(400).json({ error: 'rfpId, vendorId, emailContent required' });
        }

        // Get RFP context
        const rfp = await prisma.rFP.findUnique({ where: { id: rfpId } });
        if (!rfp) {
            return res.status(404).json({ error: 'RFP not found' });
        }

        // Parse proposal with AI
        const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/parse-proposal`, {
            emailContent,
            rfpContext: rfp
        });

        const aiResult = await aiResponse.data;

        if (!aiResult.success) {
            return res.status(400).json({ error: 'Failed to parse proposal', details: aiResult.error });
        }

        const parsed = aiResult.data;

        // Create proposal
        const proposal = await prisma.proposal.create({
            data: {
                rfpId,
                vendorId,
                rawEmailContent: emailContent,
                parsedData: parsed,
                pricing: parsed.pricing,
                terms: parsed.terms,
                attachments: [],
                aiScore: parsed.completeness,
                status: 'RECEIVED',
            },
        });

        // Update RFPVendor status
        await prisma.rFPVendor.updateMany({
            where: { rfpId, vendorId },
            data: {
                status: 'RESPONDED',
                respondedAt: new Date(),
            },
        });

        res.json({ success: true, proposal });
    } catch (error: any) {
        console.error('Submit proposal error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get AI recommendation for RFP
app.get('/api/rfps/:id/recommendation', async (req: Request, res: Response) => {
    try {
        if (!req.params.id) {
            return res.status(400).json({ error: 'RFP ID required' });
        }
        const rfp = await prisma.rFP.findUnique({
            where: { id: req.params.id },
            include: {
                proposals: {
                    include: {
                        vendor: true,
                    },
                },
            },
        });

        if (!rfp) {
            return res.status(404).json({ error: 'RFP not found' });
        }

        if (rfp.proposals.length === 0) {
            return res.status(400).json({ error: 'No proposals to compare' });
        }

        // Get AI recommendation
        const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/recommend`, {
            proposals: rfp.proposals,
            rfp
        });

        const result = await aiResponse.data;
        res.json(result);
    } catch (error: any) {
        console.error('Get recommendation error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Gateway running port ${PORT}`);
});
