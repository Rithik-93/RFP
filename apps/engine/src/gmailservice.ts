import { google } from "googleapis";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { config } from "./config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const oauth2Client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "",
});

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN || "",
});

const gmail = google.gmail("v1");

// Keep track of processed messages in memory
const processedMessageIds = new Set<string>();

// Attachment storage directory
const ATTACHMENTS_DIR = path.join(__dirname, "../attachments");
if (!fs.existsSync(ATTACHMENTS_DIR)) {
    fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

//   Extract subject, sender, body, etc. from a Gmail message.

const extractEmailData = async (message: any, messageId: string): Promise<any> => {
    try {
        const headers = message.payload.headers || [];
        const subject =
            headers.find((h: any) => h.name === "Subject")?.value || "No Subject";
        const from =
            headers.find((h: any) => h.name === "From")?.value || "Unknown Sender";
        const to =
            headers.find((h: any) => h.name === "To")?.value || "Unknown Recipient";
        const date =
            headers.find((h: any) => h.name === "Date")?.value || "Unknown Date";
        const inReplyTo =
            headers.find((h: any) => h.name === "In-Reply-To")?.value || null;
        const body = extractBody(message.payload);
        const attachments = await extractAttachments(message.payload, messageId);

        return {
            id: message.id,
            threadId: message.threadId,
            labelIds: message.labelIds,
            snippet: message.snippet,
            subject,
            from,
            to,
            date,
            inReplyTo,
            body,
            attachments,
        };
    } catch (error) {
        console.error("Error extracting email data:", error);
        return { error: "Failed to extract email data" };
    }
};

//   Recursively extract plain text or HTML body from email payload.

const extractBody = (payload: any): string => {
    try {
        if (payload.body?.data) return decodeBase64(payload.body.data);

        if (payload.parts) {
            for (const part of payload.parts) {
                if (
                    (part.mimeType === "text/plain" || part.mimeType === "text/html") &&
                    part.body?.data
                ) {
                    return decodeBase64(part.body.data);
                }
                if (part.parts) {
                    const nestedBody = extractBody(part);
                    if (nestedBody) return nestedBody;
                }
            }
        }
        return "No body content";
    } catch (error) {
        console.error("Error extracting body:", error);
        return "Error extracting body content";
    }
};

//   Extract and download attachments from email payload.

const extractAttachments = async (payload: any, messageId: string): Promise<any[]> => {
    const attachments: any[] = [];

    const processPartForAttachments = async (part: any) => {
        // Check if part has filename (indicates attachment)
        if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
            try {
                // Download attachment from Gmail
                const attachment = await gmail.users.messages.attachments.get({
                    userId: "me",
                    messageId: messageId,
                    id: part.body.attachmentId,
                    auth: oauth2Client,
                });

                // Decode attachment data
                const data = attachment.data.data;
                if (!data) return;

                const buffer = Buffer.from(
                    data.replace(/-/g, "+").replace(/_/g, "/"),
                    "base64"
                );

                // Generate unique filename
                const timestamp = Date.now();
                const sanitizedFilename = part.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
                const filename = `${messageId}_${timestamp}_${sanitizedFilename}`;
                const filepath = path.join(ATTACHMENTS_DIR, filename);

                // Save to disk
                fs.writeFileSync(filepath, buffer);

                attachments.push({
                    filename: part.filename,
                    mimeType: part.mimeType,
                    size: buffer.length,
                    filepath: `attachments/${filename}`, /* Relative path to support all envirnment */
                    attachmentId: part.body.attachmentId,
                });

                console.log(`Downloaded attachment: ${part.filename} (${part.mimeType})`);
            } catch (error) {
                console.error(`Error downloading attachment ${part.filename}:`, error);
            }
        }

        // Recursively process nested parts
        if (part.parts) {
            for (const subPart of part.parts) {
                await processPartForAttachments(subPart);
            }
        }
    };

    await processPartForAttachments(payload);
    return attachments;
};

//  Process new Gmail messages between two historyIds.

export const processNewMessagesFromHistory = async (
    startHistoryId: string,
    newHistoryId: string,
    emailAddress: string,
    updateHistoryId: (email: string, historyId: string) => Promise<void>
) => {
    try {
        console.log(
            `Fetching new messages from history ${startHistoryId} → ${newHistoryId}`
        );

        const historyResponse = await gmail.users.history.list({
            userId: "me",
            startHistoryId,
            historyTypes: ["messageAdded"],
            auth: oauth2Client,
        });

        const histories = historyResponse.data.history || [];
        console.log(`Found ${histories.length} history records`);

        for (const history of histories) {
            if (history.messagesAdded) {
                for (const messageAdded of history.messagesAdded) {
                    const message = messageAdded.message;

                    if (!message?.id || processedMessageIds.has(message.id)) continue;

                    console.log("Processing message:", message.id);

                    try {
                        const fullMsg = await gmail.users.messages.get({
                            userId: "me",
                            id: message.id,
                            format: "full",
                            auth: oauth2Client,
                        });

                        const emailData = await extractEmailData(fullMsg.data, message.id);
                        console.log("Email:", {
                            subject: emailData.subject,
                            from: emailData.from,
                            date: emailData.date,
                            snippet: emailData.snippet?.substring(0, 100) + "...",
                            attachments: emailData.attachments?.length || 0,
                        });

                        // Send to AI processing endpoint
                        try {
                            const axios = await import('axios');
                            const processResponse = await axios.default.post(`${config.engineUrl}/api/process-email-reply`, {
                                emailMessageId: emailData.id,
                                inReplyTo: emailData.inReplyTo,
                                from: emailData.from,
                                subject: emailData.subject,
                                body: emailData.body,
                                attachments: emailData.attachments || []
                            });
                            console.log(`AI Processing: ${processResponse.data.type} (${processResponse.data.attachmentCount} attachments)`);
                        } catch (processError: any) {
                            console.error('Failed to process email with AI:', processError.response?.data || processError.message);
                        }

                        // Mark as read
                        await gmail.users.messages.modify({
                            userId: "me",
                            id: message.id,
                            auth: oauth2Client,
                            requestBody: { removeLabelIds: ["UNREAD"] },
                        });

                        console.log("Marked message as read");
                        processedMessageIds.add(message.id);
                    } catch (error) {
                        console.error("Error processing message:", error);
                    }
                }
            }
        }

        // Update history file
        await updateHistoryId(emailAddress, newHistoryId);
    } catch (error) {
        console.error("Error processing history:", error);
    }
};

const decodeBase64 = (data: string): string => {
    try {
        const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
        const buff = Buffer.from(base64, "base64");
        return buff.toString("utf8");
    } catch (error) {
        console.error("Error decoding base64:", error);
        return "Error decoding content";
    }
};

//  Periodic cleanup of processed message IDs.

setInterval(() => {
    if (processedMessageIds.size > 1000) {
        const array = Array.from(processedMessageIds);
        processedMessageIds.clear();
        array.slice(-500).forEach((id) => processedMessageIds.add(id));
        console.log("Cleaned up processed messages set");
    }
}, 60 * 60 * 1000); // Run every hour