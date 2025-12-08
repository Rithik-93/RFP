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

    let negotiationContext = '';
    if (historicalProposals.length > 0) {
        const pastDeals = historicalProposals.map((p: any) => {
            const pricing = p.pricing as any;
            return `  - ${p.rfp.title}: ${pricing?.currency || p.rfp.currency} ${pricing?.total || 'N/A'}`;
        }).join('\n');
        negotiationContext = `\n\nNote: We have successfully worked with you on:\n${pastDeals}\nWe look forward to continuing our partnership.`;
    }

    const emailBody = customMessage || `Dear ${vendor.name},

We are inviting you to submit a proposal for the following requirement:

Title: ${rfp.title}
Description: ${rfp.description}

Budget: ${rfp.currency} ${rfp.budget}
Delivery Deadline: ${rfp.deliveryDeadline.toISOString().split('T')[0]}
Payment Terms: To be discussed

Requirements:
${JSON.stringify(rfp.requirements, null, 2)}

Please reply to this email with your proposal including:
- Pricing breakdown
- Delivery timeline
- Payment terms
- Warranty details
- Any special terms or conditions${negotiationContext}

Looking forward to your response.

Best regards,
${rfp.createdBy || 'RFP Team'}`;

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
