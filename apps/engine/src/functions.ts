import { prisma } from '@rfp/database';

export const functionDeclarations = [
    {
        name: 'listVendors',
        description: 'Get all vendors from the database',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'createVendors',
        description: 'Add one or more vendors to the database',
        parameters: {
            type: 'object',
            properties: {
                vendors: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Vendor name' },
                            email: { type: 'string', description: 'Vendor email' },
                            phone: { type: 'string', description: 'Vendor phone (optional)' },
                            address: { type: 'object', description: 'Vendor address as JSON (optional)' }
                        },
                        required: ['name', 'email']
                    },
                    description: 'Array of vendors to create'
                }
            },
            required: ['vendors']
        }
    },
    {
        name: 'listRFPs',
        description: 'Get all RFPs from the database',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'createRFPs',
        description: 'Create one or more RFPs as DRAFT (they need to be sent separately)',
        parameters: {
            type: 'object',
            properties: {
                rfps: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            title: { type: 'string', description: 'RFP title' },
                            description: { type: 'string', description: 'RFP description' },
                            requirements: { type: 'object', description: 'Structured requirements as key-value pairs, e.g. {ram: "16GB", storage: "256GB SSD", gpu: "NVIDIA RTX",...etc etc}' },
                            budget: { type: 'number', description: 'Budget amount' },
                            currency: { type: 'string', description: 'Currency code (e.g., USD, INR)' },
                            deliveryDeadline: { type: 'string', description: 'Deadline in ISO format' },
                            createdBy: { type: 'string', description: 'Creator identifier' }
                        },
                        required: ['title', 'description', 'budget', 'deliveryDeadline']
                    },
                    description: 'Array of RFPs to create'
                }
            },
            required: ['rfps']
        }
    },
    {
        name: 'generateRFPEmailPreview',
        description: 'Generate a preview of the RFP email to be sent to vendors. Shows the email content with negotiation insights from past deals. User can review and request changes before sending.',
        parameters: {
            type: 'object',
            properties: {
                rfpId: { type: 'string', description: 'RFP ID' },
                vendorEmails: { type: 'array', items: { type: 'string' }, description: 'Vendor emails to send to' },
                customMessage: { type: 'string', description: 'Optional custom message to override default template' }
            },
            required: ['rfpId', 'vendorEmails']
        }
    },
    {
        name: 'sendRFPEmailApproved',
        description: 'Send the approved RFP email to vendors after user has reviewed and approved the preview',
        parameters: {
            type: 'object',
            properties: {
                rfpId: { type: 'string', description: 'RFP ID' },
                vendorEmails: { type: 'array', items: { type: 'string' }, description: 'Vendor emails' },
                emailBody: { type: 'string', description: 'The approved email body to send' }
            },
            required: ['rfpId', 'vendorEmails', 'emailBody']
        }
    },
    {
        name: 'listProposals',
        description: 'Get proposals, optionally filtered by RFP ID',
        parameters: {
            type: 'object',
            properties: {
                rfpId: { type: 'string', description: 'Optional RFP ID to filter proposals' }
            },
            required: []
        }
    },
    {
        name: 'listRFPReplies',
        description: 'Get ALL email replies for an RFP (including DECLINE, QUESTION, PROPOSAL types) - use this to check vendor responses',
        parameters: {
            type: 'object',
            properties: {
                rfpId: { type: 'string', description: 'RFP ID to get replies for' }
            },
            required: ['rfpId']
        }
    },
    {
        name: 'replyToVendor',
        description: 'Send an email reply to a vendor in response to their question or message about an RFP',
        parameters: {
            type: 'object',
            properties: {
                rfpId: { type: 'string', description: 'RFP ID' },
                vendorEmail: { type: 'string', description: 'Vendor email address to reply to' },
                message: { type: 'string', description: 'Your message/reply to the vendor' }
            },
            required: ['rfpId', 'vendorEmail', 'message']
        }
    },
    {
        name: 'evaluateProposals',
        description: 'AI-powered evaluation and comparison of proposals for an RFP. Returns scoring, comparison, and recommendation.',
        parameters: {
            type: 'object',
            properties: {
                rfpId: { type: 'string', description: 'RFP ID to evaluate proposals for' }
            },
            required: ['rfpId']
        }
    },
    {
        name: 'updateProposalStatus',
        description: 'Update proposal status (accept, reject, or under review)',
        parameters: {
            type: 'object',
            properties: {
                proposalId: { type: 'string', description: 'Proposal ID' },
                status: { type: 'string', description: 'Status: ACCEPTED, REJECTED, or UNDER_REVIEW' }
            },
            required: ['proposalId', 'status']
        }
    },
    {
        name: 'updateRFPStatus',
        description: 'Update RFP status (draft, sent, closed, or cancelled)',
        parameters: {
            type: 'object',
            properties: {
                rfpId: { type: 'string', description: 'RFP ID' },
                status: { type: 'string', description: 'Status: DRAFT, SENT, CLOSED, or CANCELLED' }
            },
            required: ['rfpId', 'status']
        }
    },
    {
        name: 'getHistoricalProposals',
        description: 'Get historical accepted/successful proposals to use as negotiation leverage for new RFPs. Returns pricing, terms, and vendor info from past deals.',
        parameters: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Max number of proposals to return (default 10)' },
                minScore: { type: 'number', description: 'Minimum AI score to filter by (optional)' }
            },
            required: []
        }
    }
];

export class AIActions {
    async listVendors() {
        return await prisma.vendor.findMany();
    }

    async createVendors(args: any) {
        const vendors = args.vendors || [];

        try {
            const result = await prisma.vendor.createMany({
                data: vendors.map((vendor: any) => ({
                    name: vendor.name,
                    email: vendor.email,
                    phone: vendor.phone,
                    address: vendor.address,
                })),
                skipDuplicates: true,
            });

            return {
                total: vendors.length,
                successful: result.count,
                failed: 0,
            };
        } catch (error: any) {
            return {
                total: vendors.length,
                successful: 0,
                failed: vendors.length,
                error: error.message,
            };
        }
    }

    async listRFPs() {
        return await prisma.rFP.findMany();
    }

    async createRFPs(args: any) {
        const rfps = args.rfps || [];

        try {
            const result = await prisma.rFP.createMany({
                data: rfps.map((rfpData: any) => ({
                    title: rfpData.title,
                    description: rfpData.description,
                    requirements: rfpData.requirements || {},
                    budget: parseFloat(rfpData.budget),
                    currency: rfpData.currency || 'USD',
                    deliveryDeadline: new Date(rfpData.deliveryDeadline),
                    createdBy: rfpData.createdBy || undefined,
                    status: 'DRAFT',
                })),
                skipDuplicates: true,
            });

            return {
                total: rfps.length,
                successful: result.count,
                failed: 0,
            };
        } catch (error: any) {
            return {
                total: rfps.length,
                successful: 0,
                failed: rfps.length,
                error: error.message,
            };
        }
    }

    async generateRFPEmailPreview(args: any) {
        const { rfpId, vendorEmails, customMessage } = args;
        const { generateEmailTemplate } = await import('./email');

        const vendors = await prisma.vendor.findMany({
            where: { email: { in: vendorEmails } }
        });

        if (vendors.length === 0) {
            throw new Error('No vendors found with the provided emails');
        }

        const previews = [];
        for (const vendor of vendors) {
            const template = await generateEmailTemplate(
                rfpId,
                vendor.email,
                customMessage
            );
            previews.push(template);
        }

        return {
            rfpId,
            totalVendors: vendors.length,
            previews: previews.map(p => ({
                vendorName: p.vendorName,
                vendorEmail: p.vendorEmail,
                subject: p.subject,
                body: p.body
            }))
        };
    }

    async sendRFPEmailApproved(args: any) {
        const { rfpId, vendorEmails, emailBody } = args;

        const vendors = await prisma.vendor.findMany({
            where: { email: { in: vendorEmails } }
        });

        if (vendors.length === 0) {
            throw new Error('No vendors found with the provided emails');
        }

        const rfp: any = await prisma.rFP.findUnique({ where: { id: rfpId } });
        if (!rfp) {
            throw new Error('RFP not found');
        }

        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: parseInt(process.env.SMTP_PORT || '587') === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const results = [];
        for (const vendor of vendors) {
            try {
                const info = await transporter.sendMail({
                    from: process.env.SMTP_USER,
                    to: vendor.email,
                    subject: `RFP: ${rfp.title}`,
                    text: emailBody,
                });

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

                results.push({ vendorEmail: vendor.email, status: 'sent', messageId: info.messageId });
            } catch (error: any) {
                console.error(`Failed to send to ${vendor.email}:`, error);
                results.push({ vendorEmail: vendor.email, status: 'failed', error: error.message });
            }
        }

        await prisma.rFP.update({
            where: { id: rfp.id },
            data: { status: 'SENT' },
        });

        return {
            success: true,
            rfpId,
            totalVendors: vendors.length,
            results
        };
    }

    async listProposals(args: any) {
        if (args.rfpId) {
            return await prisma.proposal.findMany({
                where: { rfpId: args.rfpId },
                include: { vendor: true }
            });
        }

        return await prisma.proposal.findMany({
            include: { vendor: true }
        });
    }

    async listRFPReplies(args: any) {
        const { rfpId } = args;

        // Get all RFPVendor records for this RFP with their replies
        const rfpVendors = await prisma.rFPVendor.findMany({
            where: { rfpId },
            include: {
                vendor: true,
                replies: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        // Flatten to list of replies with vendor info
        const replies = rfpVendors.flatMap(rv =>
            rv.replies.map(reply => ({
                ...reply,
                vendor: rv.vendor,
                rfpVendorStatus: rv.status
            }))
        );

        return replies;
    }

    async replyToVendor(args: any) {
        const { rfpId, vendorEmail, message } = args;

        // Find the RFPVendor record
        const rfpVendor = await prisma.rFPVendor.findFirst({
            where: {
                rfpId,
                vendor: { email: vendorEmail }
            },
            include: {
                vendor: true,
                rfp: true,
                replies: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!rfpVendor) {
            throw new Error(`No RFP vendor found for ${vendorEmail} on RFP ${rfpId}`);
        }

        // Get the last reply to get the thread messageId
        const lastReply = rfpVendor.replies[0];
        if (!lastReply) {
            throw new Error('No previous message from vendor to reply to');
        }

        // Send email reply via email service
        const { sendVendorReply } = await import('./email');
        const result = await sendVendorReply({
            to: vendorEmail,
            subject: `Re: ${rfpVendor.rfp.title}`,
            message,
            inReplyTo: lastReply.emailMessageId,
            references: lastReply.inReplyTo ? `${lastReply.inReplyTo} ${lastReply.emailMessageId}` : lastReply.emailMessageId
        });

        return {
            success: true,
            sentTo: vendorEmail,
            rfpTitle: rfpVendor.rfp.title,
            messageId: result.messageId
        };
    }

    async evaluateProposals(args: any) {
        const { rfpId } = args;
        const axios = await import('axios');

        const rfp: any = await prisma.rFP.findUnique({
            where: { id: rfpId },
            include: {
                proposals: {
                    include: { vendor: true }
                }
            }
        });

        if (!rfp || rfp.proposals.length === 0) {
            return { error: 'No proposals found for this RFP' };
        }

        const prompt = `Evaluate these proposals for an RFP and provide a recommendation.

RFP: "${rfp.title}"
Budget: ${rfp.currency} ${rfp.budget}
Requirements: ${JSON.stringify(rfp.requirements)}

Proposals:
${rfp.proposals.map((p: any, i: number) => {
            const pricing = p.pricing as any;
            const parsed = p.parsedData as any;
            return `
${i + 1}. ${p.vendor.name}
   Price: ${pricing?.total || 'N/A'} ${pricing?.currency || rfp.currency}
   Timeline: ${parsed?.timeline || 'N/A'}
   Terms: ${JSON.stringify(parsed?.terms || {})}
   Summary: ${parsed?.summary || 'N/A'}
`;
        }).join('\n')}

Return JSON with:
{
  "recommendedVendor": "vendor name",
  "score": number (0-100),
  "reasoning": "brief explanation",
  "comparison": "quick comparison of all vendors",
  "riskAssessment": "LOW|MEDIUM|HIGH"
}`;

        const response = await axios.default.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            }
        );

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const clean = text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');

        try {
            return JSON.parse(clean);
        } catch {
            return { error: 'Failed to parse evaluation' };
        }
    }

    async updateProposalStatus(args: any) {
        const { proposalId, status } = args;

        const proposal = await prisma.proposal.update({
            where: { id: proposalId },
            data: { status }
        });

        return {
            success: true,
            proposalId,
            status: proposal.status
        };
    }

    async updateRFPStatus(args: any) {
        const { rfpId, status } = args;

        const rfp = await prisma.rFP.update({
            where: { id: rfpId },
            data: { status }
        });

        return {
            success: true,
            rfpId,
            status: rfp.status
        };
    }

    async getHistoricalProposals(args: any) {
        const { limit = 10, minScore } = args;

        const proposals: any = await prisma.proposal.findMany({
            where: {
                status: 'ACCEPTED',
                ...(minScore ? { aiScore: { gte: minScore } } : {})
            },
            include: {
                vendor: true,
                rfp: {
                    select: {
                        title: true,
                        budget: true,
                        currency: true,
                        deliveryDeadline: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return proposals.map((p: any) => ({
            vendor: p.vendor.name,
            rfpTitle: p.rfp.title,
            pricing: p.pricing,
            terms: p.parsedData?.terms || p.terms,
            timeline: p.parsedData?.timeline,
            aiScore: p.aiScore,
            acceptedOn: p.updatedAt
        }));
    }
}

const aiActions = new AIActions();

export async function executeFunction(name: string, args: any): Promise<any> {
    switch (name) {
        case 'listVendors':
            return await aiActions.listVendors();
        case 'createVendors':
            return await aiActions.createVendors(args);
        case 'listRFPs':
            return await aiActions.listRFPs();
        case 'createRFPs':
            return await aiActions.createRFPs(args);
        case 'generateRFPEmailPreview':
            return await aiActions.generateRFPEmailPreview(args);
        case 'sendRFPEmailApproved':
            return await aiActions.sendRFPEmailApproved(args);
        case 'listProposals':
            return await aiActions.listProposals(args);
        case 'listRFPReplies':
            return await aiActions.listRFPReplies(args);
        case 'replyToVendor':
            return await aiActions.replyToVendor(args);
        case 'evaluateProposals':
            return await aiActions.evaluateProposals(args);
        case 'updateProposalStatus':
            return await aiActions.updateProposalStatus(args);
        case 'updateRFPStatus':
            return await aiActions.updateRFPStatus(args);
        case 'getHistoricalProposals':
            return await aiActions.getHistoricalProposals(args);
        default:
            throw new Error(`Unknown function: ${name}`);
    }
}
