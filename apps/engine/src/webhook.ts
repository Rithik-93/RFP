import { type Request, type Response } from "express";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from 'url';
import { processNewMessagesFromHistory } from "./gmailservice";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const gmailWebhook = async (req: Request, res: Response) => {
    try {
        //     console.log("Webhook received today:", JSON.stringify(req.body, null, 2));
        const message = req.body?.message;
        if (!message?.data) {
            console.log("No message data in request");
            return res.status(400).send("Invalid Pub/Sub message");
        }
        const dataBuffer = Buffer.from(message.data, "base64").toString("utf-8");
        const notification = JSON.parse(dataBuffer);

        const emailAddress = notification.emailAddress;
        const newHistoryId = notification.historyId;

        const historyData = await readHistoryIds();
        const startHistoryId = historyData[emailAddress];
        console.log(notification);

        if (startHistoryId) {
            await processNewMessagesFromHistory(
                startHistoryId,
                newHistoryId,
                emailAddress,
                writeHistoryId
            );
        } else {
            console.log("First webhook for this user, saving initial historyId.");
            await writeHistoryId(emailAddress, newHistoryId);
        }
        res.sendStatus(200);
    } catch (error) {
        console.error("Webhook error:", error);
        res.sendStatus(500);
    }
};

const readHistoryIds = async () => {
    const HISTORY_FILE = path.join(__dirname, "../database/history.json");
    try {
        const data = await fs.readFile(HISTORY_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error: any) {
        if (error.code === "ENOENT") {
            console.log("History file not found, creating a new one.");
            return {};
        }
        console.error("Error reading history file:", error);
        return {};
    }
};

const writeHistoryId = async (emailAddress: string, historyId: string) => {
    const HISTORY_FILE = path.join(__dirname, "../database/history.json");
    try {
        const historyData = await readHistoryIds();
        historyData[emailAddress] = historyId;
        await fs.writeFile(
            HISTORY_FILE,
            JSON.stringify(historyData, null, 2),
            "utf-8"
        );
        console.log(`Updated historyId for ${emailAddress} in file.`);
    } catch (error) {
        console.error("Error writing history file:", error);
    }
};