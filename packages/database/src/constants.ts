// Shared constants and enums for the RFP system
// Note: Status enums are already exported from Prisma Client 
// (RFPStatus, ProposalStatus, Email Direction, RFPVendorStatus)
// We only define app-specific enums here

// AI Tool Names
export enum AITool {
    LIST_VENDORS = 'listVendors',
    CREATE_VENDORS = 'createVendors',
    LIST_RFPS = 'listRFPs',
    CREATE_RFPS = 'createRFPs',
    GENERATE_RFP_EMAIL_PREVIEW = 'generateRFPEmailPreview',
    SEND_RFP_EMAIL_APPROVED = 'sendRFPEmailApproved',
    LIST_PROPOSALS = 'listProposals',
    LIST_RFP_REPLIES = 'listRFPReplies',
    REPLY_TO_VENDOR = 'replyToVendor',
    EVALUATE_PROPOSALS = 'evaluateProposals',
    UPDATE_PROPOSAL_STATUS = 'updateProposalStatus',
    UPDATE_RFP_STATUS = 'updateRFPStatus',
    GET_HISTORICAL_PROPOSALS = 'getHistoricalProposals'
}

// AI Response Types
export enum AIResponseType {
    TOOL_CALL = 'tool_call',
    RESPONSE = 'response',
    ERROR = 'error'
}
