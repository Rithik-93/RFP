import axios from "axios";

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3001';

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
        description: 'Create one or more RFPs and send them to vendors',
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
                            requirements: { type: 'array', items: { type: 'string' }, description: 'List of requirements' },
                            budget: { type: 'number', description: 'Budget amount' },
                            currency: { type: 'string', description: 'Currency code (e.g., USD, INR)' },
                            deliveryDeadline: { type: 'string', description: 'Deadline in ISO format' },
                            createdBy: { type: 'string', description: 'Creator identifier' },
                            vendorEmails: { type: 'array', items: { type: 'string' }, description: 'List of vendor emails to send RFP to' }
                        },
                        required: ['title', 'description', 'budget', 'deliveryDeadline', 'vendorEmails']
                    },
                    description: 'Array of RFPs to create'
                }
            },
            required: ['rfps']
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
    }
];

// AI Actions class
export class AIActions {
    async listVendors() {
        const response = await axios.get(`${GATEWAY_URL}/api/vendors`);
        return response.data;
    }

    async createVendors(args: any) {
        const vendors = args.vendors || [];
        const results = [];

        for (const vendor of vendors) {
            try {
                const response = await axios.post(`${GATEWAY_URL}/api/vendors`, vendor);
                results.push({ success: true, vendor: response.data });
            } catch (error: any) {
                results.push({ success: false, error: error.response?.data?.error || error.message, vendor: vendor.name });
            }
        }

        return {
            total: vendors.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    async listRFPs() {
        const response = await axios.get(`${GATEWAY_URL}/api/rfps`);
        return response.data;
    }

    async createRFPs(args: any) {
        const rfps = args.rfps || [];
        const results = [];

        for (const rfpData of rfps) {
            try {
                // Create the RFP
                const createResponse = await axios.post(`${GATEWAY_URL}/api/rfps/direct`, {
                    title: rfpData.title,
                    description: rfpData.description,
                    requirements: rfpData.requirements,
                    budget: rfpData.budget,
                    currency: rfpData.currency,
                    deliveryDeadline: rfpData.deliveryDeadline,
                    createdBy: rfpData.createdBy
                });

                const rfp = createResponse.data.rfp;

                // Send to vendors if emails provided
                if (rfpData.vendorEmails && rfpData.vendorEmails.length > 0) {
                    await axios.post(`${GATEWAY_URL}/api/rfps/${rfp.id}/send`, {
                        vendorEmails: rfpData.vendorEmails
                    });
                }

                results.push({
                    success: true,
                    rfp: rfp,
                    emailsSent: rfpData.vendorEmails?.length || 0
                });
            } catch (error: any) {
                results.push({
                    success: false,
                    error: error.response?.data?.error || error.message,
                    title: rfpData.title
                });
            }
        }

        return {
            total: rfps.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    async listProposals(args: any) {
        const proposalsUrl = args.rfpId
            ? `${GATEWAY_URL}/api/proposals?rfpId=${args.rfpId}`
            : `${GATEWAY_URL}/api/proposals`;
        const response = await axios.get(proposalsUrl);
        return response.data;
    }
}

// Create singleton instance
const aiActions = new AIActions();

// Main execution function that routes to class methods
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

        case 'listProposals':
            return await aiActions.listProposals(args);

        default:
            throw new Error(`Unknown function: ${name}`);
    }
}
