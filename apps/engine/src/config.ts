// Engine service configuration
// NOTE: These environment variables are validated at startup in index.ts
export const config = {
    port: Number(process.env.ENGINE_PORT),
    engineUrl: process.env.ENGINE_URL!,
    geminiApiKey: process.env.GEMINI_API_KEY!,
} as const;
