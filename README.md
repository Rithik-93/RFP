# AI-Powered RFP Management System

A procurement system that uses AI to automate the RFP lifecycle - from creating RFPs using natural language to automatically parsing vendor responses and comparing proposals.

## Features

- Natural language RFP creation - just describe what you need
- Vendor management and RFP distribution via email
- Automatic email parsing using AI
- AI-powered proposal comparison and recommendations
- Chat-based interface with conversation history

## Project Setup

### Prerequisites

- Node.js v18+
- PostgreSQL (local or hosted like Neon)
- Google Gemini API key
- Gmail account with App Password

### Installation

1. Clone and install dependencies

   ```bash
   git clone <repository-url>
   cd RFP
   pnpm install
   ```
2. Setup environment variables

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```
3. Setup database

   ```bash
   cd packages/database
   pnpm run db:push
   ```
4. Configure Gmail

   **For sending:**

   - Enable 2FA on your Gmail
   - Generate App Password at https://myaccount.google.com/apppasswords
   - Add to `.env`

   **For receiving:**

   - Setup OAuth2 credentials in Google Cloud Console
   - Enable Gmail API
   - Create Pub/Sub topic for push notifications
   - Configure webhook URL (use ngrok for local development)

### Running Locally

Start all services:

```bash
# Frontend (port 3002)
cd apps/web && pnpm dev

# Gateway API (port 3001)
cd apps/gateway && pnpm dev

# AI Engine (port 3000)
cd apps/engine && pnpm dev
```

---

## Tech Stack

### Frontend

- Next.js 16 (React 19) with Tailwind CSS 4

### Backend

- **Gateway**: Express + Prisma + Zod validation
- **AI Engine**: Express + Google Gemini 1.5 Flash with function calling
- **Database**: PostgreSQL with Prisma ORM

### Email Integration

- **Sending**: Gmail SMTP via Nodemailer
- **Receiving**: Gmail API with OAuth2 + Google Pub/Sub for push notifications
- **Processing**: Webhook listens for Pub/Sub events, fetches latest emails, and processes them using AI

### Key Libraries

- `googleapis` - Gmail API and Pub/Sub
- `axios` - HTTP requests
- `zod` - Schema validation

## Design Decisions

### Architecture

- **Microservices**: Separated web, gateway, and AI engine so each can scale independently
- **Chat Interface**: Natural language is easier for describing procurement needs than filling forms
- **Function Calling**: Used Gemini's function calling for structured AI outputs instead of parsing free-form text

### Data Model

- **RFP Requirements as JSON**: Different RFPs need different fields, JSON gives flexibility
- **Separate RFPVendor and Proposal**: Track who we contacted vs who actually responded
- **RFPReply Model**: Vendors send multiple emails (questions, clarifications, proposals) - needed to classify them

### Email

- **Gmail API for Receiving**: OAuth2 + Pub/Sub for real-time notifications, better than IMAP polling
- **SMTP for Sending**: Simple and reliable, though daily limit of 500 emails
- **Email Threading**: Track `In-Reply-To` headers to link vendor replies to original RFPs

### Key Assumptions

- Single user system (no auth needed)
- Vendors will reply to the original email thread
- AI-parsed data is good enough (user can review but doesn't need to manually enter everything)
- Emails are structured enough for AI to extract pricing and terms

### Limitations

- No authentication/authorization
- No real-time UI updates (need to refresh page)
- Basic HTML emails (not fancy formatted)
- No batch DB operations (each message insert happens immediately)
- Chat context grows infinitely (no summarization implemented)

---

## AI Tools Usage

### Tools Used

- **Cursor**: For turborepo monorepo setup and UI package configuration (this was a hassle to do manually)
- **Claude & GPT**: Primary coding assistants for most development work

### What AI Helped With

- Turborepo and workspace setup
- Express API boilerplate
- React components and layouts
- Debugging TypeScript type errors
- Code optimization

### What I Learned

- Email push notifications using Google Pub/Sub (learned this for the first time!)
- Gmail API OAuth2 flow and watch notifications
- Function calling is way more reliable than parsing AI responses
- Microservices add complexity but help with scalability
- AI can generate good boilerplate but needs human review for edge cases

## What Was Planned (But Ran Out of Time)

1. **Batch DB Updates**: Use Redis to cache messages and periodically flush to PostgreSQL instead of inserting on every chat message
2. **Chat Context Summarization**: Right now all messages are sent as context to AI. Need to summarize old messages when context gets too large
3. **Better Email HTML**: Current emails are plain text, wanted to make them properly formatted HTML templates
4. **PDF Attachment Processing**: Use Gemini's vision API to extract data from PDF proposals
5. **Real-time Updates**: WebSockets for live proposal updates without page refresh

---

## Author

**Rithik**
GitHub: [@Rithik-93](https://github.com/Rithik-93)
