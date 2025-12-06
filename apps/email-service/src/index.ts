import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { prisma } from '@rfp/database';
import { config } from './config/config';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// Create email transporter
const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
    },
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'email-service' });
});

// Send RFP to vendors
app.post('/api/send-rfp', async (req, res) => {
    try {
        const { rfpId, vendorIds } = req.body;

        if (!rfpId || !vendorIds || !Array.isArray(vendorIds)) {
            return res.status(400).json({ error: 'rfpId and vendorIds array required' });
        }

        // Get RFP details
        const rfp = await prisma.rFP.findUnique({ where: { id: rfpId } });
        if (!rfp) {
            return res.status(404).json({ error: 'RFP not found' });
        }

        // Get vendors
        const vendors = await prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
        });

        const results = [];

        for (const vendor of vendors) {
            try {
                // Create email content
                const emailBody = `
Dear ${vendor.name},

We are inviting you to submit a proposal for the following requirement:

Title: ${rfp.title}
Description: ${rfp.description}

Budget: ${rfp.currency} ${rfp.budget}
Delivery Deadline: ${rfp.deliveryDeadline.toISOString().split('T')[0]}
Payment Terms: ${rfp.paymentTerms || 'To be discussed'}

Requirements:
${JSON.stringify(rfp.requirements, null, 2)}

Please reply to this email with your proposal including:
- Pricing breakdown
- Delivery timeline
- Payment terms
- Warranty details
- Any special terms or conditions

Looking forward to your response.

Best regards,
${rfp.createdBy}
`;

                // Send email
                const info = await transporter.sendMail({
                    from: config.SMTP_USER,
                    to: vendor.email,
                    subject: `RFP: ${rfp.title}`,
                    text: emailBody,
                });

                // Log email
                await prisma.emailLog.create({
                    data: {
                        rfpId: rfp.id,
                        vendorId: vendor.id,
                        direction: 'OUTBOUND',
                        subject: `RFP: ${rfp.title}`,
                        body: emailBody,
                        messageId: info.messageId,
                        status: 'SENT',
                    },
                });

                // Update RFPVendor status
                await prisma.rFPVendor.upsert({
                    where: {
                        rfpId_vendorId: {
                            rfpId: rfp.id,
                            vendorId: vendor.id,
                        },
                    },
                    create: {
                        rfpId: rfp.id,
                        vendorId: vendor.id,
                        status: 'SENT',
                        sentAt: new Date(),
                    },
                    update: {
                        status: 'SENT',
                        sentAt: new Date(),
                    },
                });

                results.push({ vendorId: vendor.id, status: 'sent', messageId: info.messageId });
            } catch (error: any) {
                console.error(`Failed to send to ${vendor.email}:`, error);
                results.push({ vendorId: vendor.id, status: 'failed', error: error.message });
            }
        }

        // Update RFP status
        await prisma.rFP.update({
            where: { id: rfp.id },
            data: { status: 'SENT' },
        });

        res.json({ success: true, results });
    } catch (error: any) {
        console.error('Send RFP error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Email running on port ${PORT}`);
});
