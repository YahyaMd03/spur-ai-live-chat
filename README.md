# Spur Chat Support Widget

A production-quality, end-to-end AI live chat support widget built with Node.js, Express, TypeScript, Prisma, Next.js, and OpenAI.

## 🏗️ Architecture

### Backend (`/backend`)

- **Framework**: Express.js with TypeScript
- **Database**: Prisma ORM with PostgreSQL
- **LLM**: OpenAI GPT-4o-mini
- **Structure**:
  ```
  backend/
  ├── src/
  │   ├── db/           # Prisma client setup
  │   ├── services/     # Business logic (chat, LLM)
  │   ├── routes/       # API route handlers
  │   └── index.ts      # Express server entry
  └── prisma/
      └── schema.prisma # Database schema
  ```

### Frontend (`/frontend`)

- **Framework**: Next.js 16.1.1 (App Router) with TypeScript
- **React**: React 19.2.3 (latest stable)
- **UI**: Custom React components with CSS Modules
- **State**: React hooks (useState, useEffect)
- **Persistence**: localStorage for session management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Backend Setup

1. **Navigate to backend directory**:

   ```bash
   cd backend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure your settings:

   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/spur_chat
   DATABASE_PUBLIC_URL=postgresql://user:password@localhost:5432/spur_chat
   OPENAI_API_KEY=sk-your-key-here
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

4. **Initialize database**:

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:3001`

### Frontend Setup

1. **Navigate to frontend directory** (in a new terminal):

   ```bash
   cd frontend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.example .env.local
   ```

   The default API URL (`http://localhost:3001`) should work if backend is running locally.

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 API Documentation

### POST `/chat/message`

Send a message to the AI chat support agent.

**Request Body**:

```json
{
  "message": "What is your return policy?",
  "sessionId": "optional-existing-session-id"
}
```

**Response**:

```json
{
  "reply": "We accept returns within 14 days of purchase...",
  "sessionId": "uuid-conversation-id"
}
```

**Error Responses**:

- `400`: Invalid input (empty message, too long, etc.)
- `500`: Internal server error
- `503`: LLM service unavailable (rate limits, API errors)

## 🗄️ Database Schema

### Conversation

- `id` (UUID, primary key)
- `createdAt` (DateTime)

### Message

- `id` (UUID, primary key)
- `conversationId` (UUID, foreign key)
- `sender` (String: "user" | "ai")
- `text` (String)
- `createdAt` (DateTime)

## 🤖 LLM Integration

### System Prompt

The AI is configured as a helpful ecommerce support agent with knowledge of:

- **Shipping**: USA, India, Europe
- **Delivery**: 5-7 business days
- **Returns**: Accepted within 14 days
- **Support Hours**: Mon-Fri, 9am-6pm IST

### LLM Model

I used OpenAI's `gpt-4o-mini` for a balanced tradeoff of speed, cost, and conversational ability. It provides capable contextual answers while keeping resource usage reasonable for a customer support widget.

### Configuration

- **Model**: `gpt-4o-mini` (configured via `OPENAI_MODEL` env var)
- **Max Tokens**: 500 (cost control)
- **Temperature**: 0.7 (balanced creativity for support responses)
- **History Limit**: Last 10 messages (prevents token explosion)

### Error Handling

The LLM service gracefully handles:

- Invalid API keys (401)
- Rate limits (429)
- Service outages (500/503)
- Timeouts and network errors

All errors are surfaced to users with friendly messages.

## 🎨 Frontend Features

- ✅ Scrollable message list with auto-scroll
- ✅ Clear visual distinction between user and AI messages
- ✅ Input box with send button
- ✅ Enter key to send (Shift+Enter for new line)
- ✅ Auto-resizing textarea
- ✅ Disabled send button during requests
- ✅ "Agent is typing..." indicator
- ✅ Session persistence via localStorage
- ✅ Graceful error display
- ✅ Responsive design
- ✅ Loading states

## 🔒 Security & Best Practices

- **Input Validation**: All messages are validated (length, type, empty checks, UUID format)
- **Multi-Layer Rate Limiting**:
  - Daily limit: 200 requests/day per IP (prevents long-term abuse)
  - Per-IP limit: 50 requests/15min per IP (prevents rapid-fire attacks)
  - Per-session limit: 20 requests/15min per session (prevents session-based abuse)
  - General API: 100 requests/15min per IP
- **Cost Protection**:
  - Max tokens: 500 per response (limits LLM costs)
  - History limit: Last 10 messages only (prevents token explosion)
  - Message length: 5000 characters max
- **CORS**: Restricted to configured frontend URL(s) only
- **Request Timeout**: 30-second timeout on all requests
- **Request Size Limits**: 100KB max request body size
- **Error Handling**: Sanitized error messages in production (no information leakage)
- **Session Validation**: UUID format validation for all sessionIds
- **Error Boundaries**: Backend never crashes on bad input
- **Secrets Management**: API keys via environment variables
- **Type Safety**: Full TypeScript coverage
- **Database**: Prisma migrations for schema management

## 🧪 Testing the Application

1. **Start both servers** (backend on :3001, frontend on :3000)
2. **Open the frontend** in your browser
3. **Send a test message**: "What is your shipping policy?"
4. **Verify**:
   - Message appears immediately
   - "Agent is typing..." shows
   - AI response appears
   - Session persists after refresh

## 📦 Production Considerations

### Database

- PostgreSQL is already configured (see `DATABASE_URL` in `.env`)
- Run migrations: `npx prisma migrate deploy`

### Environment Variables

- Set `NODE_ENV=production`
- Use secure secret management
- Configure CORS for your production domain

### Deployment

- **Backend**: Deploy to Railway, Render, or AWS
- **Frontend**: Deploy to Vercel, Netlify, or similar
- Update `NEXT_PUBLIC_API_URL` to point to production backend

## 🛠️ Development Commands

### Backend

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm start            # Run production build
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

### Frontend

```bash
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm start            # Run production server
npm run lint         # Run ESLint
```

## 🎯 Trade-offs & Design Decisions

### Why PostgreSQL?

- Production-ready database from the start
- Better performance and scalability
- Supports concurrent connections
- Industry standard for production applications

### Why Separate Services?

- Clear separation of concerns
- LLM service is swappable (could use Anthropic, etc.)
- Chat service handles conversation logic independently
- Easy to test and maintain

### Why localStorage for Sessions?

- No auth required (per requirements)
- Simple, works offline
- Persists across refreshes
- Can be upgraded to server-side sessions later

### Why gpt-4o-mini?

- **Balanced Performance**: Provides capable contextual answers with good conversational ability
- **Cost-Effective**: Keeps resource usage reasonable for a customer support widget
- **Fast Response Times**: Optimized for speed while maintaining quality
- **Production-Ready**: Well-suited for customer support use cases

## 💡 Potential Enhancements

### Immediate Improvements

1. **Streaming Responses**: Stream LLM tokens for better UX
2. **Retry Logic**: Automatic retry on transient failures
3. **Logging**: Structured logging (Winston/Pino) with request IDs

### Enhanced Features

1. **Multi-turn Context**: Better conversation context window management
2. **File Uploads**: Support image/document uploads
3. **Typing Indicators**: More sophisticated typing simulation
4. **Message Reactions**: Thumbs up/down for feedback
5. **Admin Dashboard**: View conversations, analytics
6. **Voice Input**: Audio-to-text (speech-to-text) integration for voice messages
   - Use Web Speech API or OpenAI Whisper for transcription
   - Allow users to speak instead of typing
   - Improve accessibility and mobile UX

### Production Hardening

1. **Monitoring & Observability**:
   - Prometheus for metrics collection and alerting
   - Grafana for visualization and dashboards
   - Sentry for error tracking
2. **Event-Driven Architecture**:
   - Kafka/RabbitMQ for message queuing and event streaming
   - Celery for distributed task processing
   - Decouple LLM processing from API requests for better scalability
3. **Cost Monitoring**:
   - Leverage OpenAI response metadata (token usage) for cost tracking
   - Track token consumption per conversation, session, and time period
   - Set up alerts for unexpected cost spikes
   - Currently usage is capped via token limits and conversation history trimming
4. **Caching**: Redis for session management and rate limiting
5. **Queue System**: Bull/BullMQ for async LLM processing
6. **API Versioning**: `/v1/chat/message` for future compatibility
7. **Redis Integration**:
   - Distributed rate limiting across multiple server instances
   - Session storage for better scalability
   - Caching conversation history to reduce database load
   - Pub/sub for real-time features

### Testing & CI/CD

1. **Unit Tests**: Jest for services and utilities
2. **Integration Tests**: Supertest for API endpoints
3. **E2E Tests**: Playwright for frontend flows
4. **LLM Mocking**: Mock OpenAI responses in tests
5. **CI/CD Pipeline**:
   - Automated testing of OpenAI integration on every pull request
   - Run integration tests with real API calls in CI environment
   - Validate LLM responses and error handling
