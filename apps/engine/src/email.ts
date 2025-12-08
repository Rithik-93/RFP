import nodemailer from 'nodemailer';
import { prisma } from '@rfp/database';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export interface EmailTemplate {
    subject: string;
    body: string;
    vendorEmail: string;
    vendorName: string;
}

export async function generateEmailTemplate(
    rfpId: string,
    vendorEmail: string,
    customMessage?: string
): Promise<EmailTemplate> {
    const axios = await import('axios');
    
    const rfp = await prisma.rFP.findUnique({ where: { id: rfpId } });
    if (!rfp) {
        throw new Error('RFP not found');
    }

    const vendor = await prisma.vendor.findUnique({ where: { email: vendorEmail } });
    if (!vendor) {
        throw new Error('Vendor not found');
    }

    const historicalProposals = await prisma.proposal.findMany({
        where: {
            vendorId: vendor.id,
            status: 'ACCEPTED',
        },
        include: {
            rfp: {
                select: {
                    title: true,
                    budget: true,
                    currency: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
    });

    // Build context for AI
    let partnershipHistory = '';
    if (historicalProposals.length > 0) {
        const pastDeals = historicalProposals.map((p: any) => {
            const pricing = p.pricing as any;
            return `- ${p.rfp.title}: ${pricing?.currency || p.rfp.currency} ${pricing?.total || 'N/A'}`;
        }).join('\n');
        partnershipHistory = `\n\nPast successful collaborations with this vendor:\n${pastDeals}`;
    }

    // If custom message provided, use it directly
    if (customMessage) {
        return {
            subject: `RFP: ${rfp.title}`,
            body: customMessage,
            vendorEmail: vendor.email,
            vendorName: vendor.name,
        };
    }

    // Generate email using AI
    const prompt = `Generate a professional, well-formatted RFP email invitation for a vendor.

RFP Details:
- Title: ${rfp.title}
- Description: ${rfp.description}
- Budget: ${rfp.currency} ${rfp.budget.toLocaleString()}
- Delivery Deadline: ${rfp.deliveryDeadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
- Requirements: ${JSON.stringify(rfp.requirements, null, 2)}

Vendor Details:
- Name: ${vendor.name}
- Email: ${vendorEmail}${partnershipHistory}

Instructions:
1. Write a professional, warm, and clear email
2. Use proper formatting with sections and bullet points
3. Include all RFP details in an organized manner
4. If there's partnership history, acknowledge it warmly
5. Ask vendor to reply with: pricing breakdown, delivery timeline, payment terms, warranty, and any special conditions
6. Keep tone professional but friendly
7. Sign off as "${rfp.createdBy || 'Procurement Team'}"
8. Make it visually clean and easy to read

Return ONLY the email body text (no subject line, no JSON, just the email content).`;

    const response = await axios.default.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        }
    );

    const emailBody = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 
        `Dear ${vendor.name},\n\nWe invite you to submit a proposal for: ${rfp.title}\n\nBudget: ${rfp.currency} ${rfp.budget}\nDeadline: ${rfp.deliveryDeadline.toLocaleDateString()}\n\nBest regards,\n${rfp.createdBy || 'Procurement Team'}`;

    return {
        subject: `RFP: ${rfp.title}`,
        body: emailBody,
        vendorEmail: vendor.email,
        vendorName: vendor.name,
    };
}

export async function sendRFPToVendors(rfpId: string, vendorIds: string[]) {
    const rfp = await prisma.rFP.findUnique({ where: { id: rfpId } });
    if (!rfp) {
        throw new Error('RFP not found');
    }

    const vendors = await prisma.vendor.findMany({
        where: { id: { in: vendorIds } },
    });

    const results = [];

    for (const vendor of vendors) {
        try {
            const template = await generateEmailTemplate(rfpId, vendor.email);
            const emailBody = template.body;

            // Send email
            const info = await transporter.sendMail({
                from: process.env.SMTP_USER,
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

            // Update RFPVendor
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
                    sentMessageId: info.messageId,
                    status: 'SENT',
                    sentAt: new Date(),
                },
                update: {
                    sentMessageId: info.messageId,
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

    await prisma.rFP.update({
        where: { id: rfp.id },
        data: { status: 'SENT' },
    });

    return { success: true, results };
}

export async function sendVendorReply(args: {
    to: string;
    subject: string;
    message: string;
    inReplyTo: string;
    references: string;
}) {
    const { to, subject, message, inReplyTo, references } = args;

    try {
        // Send email with threading headers
        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to,
            subject,
            text: message,
            inReplyTo,
            references
        });

        console.log(`Sent reply to ${to} (messageId: ${info.messageId})`);

        return {
            success: true,
            messageId: info.messageId,
            to
        };
    } catch (error: any) {
        console.error(`Failed to send reply to ${to}:`, error);
        throw new Error(`Email send failed: ${error.message}`);
    }
}
