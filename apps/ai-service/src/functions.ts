import axios from "axios";

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3001';

export const functionDeclarations = [
    {
        name: 'listVendors',
        description: 'Get all vendors from the database',
        parameters: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'createVendor',
        description: 'Add a new vendor to the database',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Vendor name' },
                email: { type: 'string', description: 'Vendor email' },
                phone: { type: 'string', description: 'Vendor phone (optional)' },
                address: { type: 'object', description: 'Vendor address as JSON (optional)' }
            },
            required: ['name', 'email']
        }
    },
    {
        name: 'listRFPs',
        description: 'Get all RFPs from the database',
        parameters: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'createRFP',
        description: 'Create a new RFP in the database',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'RFP title' },
                description: { type: 'string', description: 'RFP description' },
                requirements: { type: 'array', items: { type: 'string' }, description: 'List of requirements' },
                budget: { type: 'number', description: 'Budget amount' },
                currency: { type: 'string', description: 'Currency code (default: USD)' },
                deliveryDeadline: { type: 'string', description: 'Deadline in ISO format' },
                createdBy: { type: 'string', description: 'Creator identifier' }
            },
            required: ['title', 'description', 'budget', 'deliveryDeadline']
        }
    },
    {
        name: 'listProposals',
        description: 'Get all proposals, optionally filtered by RFP ID',
        parameters: {
            type: 'object',
            properties: {
                rfpId: { type: 'string', description: 'Filter by RFP ID (optional)' }
            },
            required: []
        }
    },
    {
        name: 'sendRFPToVendors',
        description: 'Send an RFP to specified vendors via email',
        parameters: {
            type: 'object',
            properties: {
                rfpId: { type: 'string', description: 'RFP ID to send' },
                vendorEmails: { type: 'array', items: { type: 'string' }, description: 'List of vendor emails' }
            },
            required: ['rfpId', 'vendorEmails']
        }
    }
];

export async function executeFunction(name: string, args: any): Promise<any> {
    switch (name) {
        case 'listVendors':
            const vendorsRes = await axios.get(`${GATEWAY_URL}/api/vendors`);
            return vendorsRes.data;

        case 'createVendor':
            const createVendorRes = await axios.post(`${GATEWAY_URL}/api/vendors`, args);
            return createVendorRes.data;

        case 'listRFPs':
            const rfpsRes = await axios.get(`${GATEWAY_URL}/api/rfps`);
            return rfpsRes.data;

        case 'createRFP':
            const createRFPRes = await axios.post(`${GATEWAY_URL}/api/rfps`, {
                message: `Create RFP: ${args.title}. ${args.description}. Budget: ${args.budget}. Deadline: ${args.deliveryDeadline}`,
                createdBy: args.createdBy || 'AI Assistant'
            });
            return createRFPRes.data;

        case 'listProposals':
            const proposalsUrl = args.rfpId
                ? `${GATEWAY_URL}/api/proposals?rfpId=${args.rfpId}`
                : `${GATEWAY_URL}/api/proposals`;
            const proposalsRes = await axios.get(proposalsUrl);
            return proposalsRes.data;

        case 'sendRFPToVendors':
            const sendRes = await axios.post(`${GATEWAY_URL}/api/rfps/${args.rfpId}/send`, {
                vendorEmails: args.vendorEmails
            });
            return sendRes.data;

        default:
            throw new Error(`Unknown function: ${name}`);
    }
}
