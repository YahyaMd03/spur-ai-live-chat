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
  │   ├── db/              # Prisma client setup with connection pooling
  │   ├── services/        # Business logic layer
  │   │   ├── chat.service.ts    # Conversation & message management
  │   │   └── llm.service.ts     # OpenAI integration & prompt handling
  │   ├── routes/         # API route handlers (thin controllers)
  │   │   └── chat.routes.ts     # POST /chat/message, GET /chat/history/:id
  │   ├── middleware/      # Express middleware
  │   │   ├── rateLimiter.ts    # Multi-layer rate limiting
  │   │   └── timeout.ts        # Request timeout handling
  │   ├── utils/          # Utility functions
  │   │   └── validation.ts       # Input validation & sanitization
  │   └── index.ts        # Express server entry point
  └── prisma/
      ├── schema.prisma   # Database schema
      └── migrations/     # Database migration history
  ```

#### Backend Architecture Layers

1. **Route Layer** (`routes/`): Thin controllers that handle HTTP requests/responses

   - Validates request format
   - Calls service layer
   - Handles errors and returns appropriate status codes

2. **Service Layer** (`services/`): Core business logic

   - `ChatService`: Manages conversations, messages, and session handling
   - `LLMService`: Handles OpenAI API calls, prompt construction, and response generation
   - Both services are independent and testable

3. **Data Layer** (`db/`): Database access via Prisma

   - Singleton Prisma client with connection pooling
   - Uses PostgreSQL adapter for better performance
   - Handles connection lifecycle and timezone configuration

4. **Middleware Layer** (`middleware/`): Cross-cutting concerns
   - Rate limiting (IP-based, session-based, daily limits)
   - Request timeout (30 seconds)
   - CORS configuration
   - Error handling

#### Design Decisions

- **Service Separation**: ChatService and LLMService are separate to allow swapping LLM providers without changing conversation logic
- **Connection Pooling**: Uses `pg` Pool with Prisma adapter for better database performance
- **Error Handling**: Services never throw unhandled errors; all errors are caught and returned as user-friendly messages
- **Type Safety**: Full TypeScript coverage with strict typing throughout
- **Stateless API**: No server-side sessions; sessionId is passed from client (stored in localStorage)

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

4. **Set up database**:

   **Option A: Using local PostgreSQL**

   - Install PostgreSQL if not already installed
   - Create a database:
     ```bash
     createdb spur_chat
     ```
   - Update `DATABASE_URL` in `.env` with your PostgreSQL credentials

   **Option B: Using a cloud database (e.g., Railway, Supabase)**

   - Create a PostgreSQL database on your preferred platform
   - Copy the connection string to `DATABASE_URL` in `.env`

   **Run migrations:**

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run database migrations
   npx prisma migrate dev --name init
   ```

   This will create the `Conversation` and `Message` tables in your database.

   **Optional: Seed data (if needed)**

   Currently, no seed data is required. The application creates conversations and messages dynamically. If you want to add seed data for testing, you can create a `prisma/seed.ts` file and run it with `npx prisma db seed`.

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

### Provider: OpenAI

We use **OpenAI** as the LLM provider. The service is designed to be swappable - you could easily replace it with Anthropic, Google, or other providers by modifying `LLMService`.

**Model**: `gpt-4o-mini` (configurable via `OPENAI_MODEL` env var, defaults to `gpt-3.5-turbo`)

**Why gpt-4o-mini?**

- Balanced performance: Good contextual understanding for support scenarios
- Cost-effective: Lower cost than GPT-4 while maintaining quality
- Fast response times: Optimized for real-time chat interactions
- Production-ready: Well-suited for customer support use cases

### Prompting Strategy

#### System Prompt

The system prompt is defined in `backend/src/services/llm.service.ts`:

```
You are a helpful and friendly customer support agent for an ecommerce store.
Your goal is to assist customers with their questions and concerns in a
professional, empathetic manner.

Store Information:
- Shipping: We ship to USA, India, and Europe
- Delivery Time: 5-7 business days
- Returns: Accepted within 14 days of purchase
- Support Hours: Monday-Friday, 9am-6pm IST

Guidelines:
- Be concise but thorough
- If you don't know something, acknowledge it and offer to help find the answer
- Always maintain a positive, helpful tone
- Use the customer's name if provided, otherwise use friendly language
- For shipping/returns questions, provide clear information based on the store policies above
```

#### Message Construction

1. **System Message**: Always sent first to set the AI's role and context
2. **Conversation History**: Last 10 messages (prevents token explosion)
   - User messages → `role: 'user'`
   - AI responses → `role: 'assistant'`
3. **Current User Message**: Appended to the history

#### Configuration

- **Max Tokens**: 500 per response (cost control, ensures concise answers)
- **Temperature**: 0.7 (balanced creativity - not too robotic, not too creative)
- **History Limit**: Last 10 messages only (prevents token costs from growing unbounded)
- **Message Format**: Standard OpenAI chat completion format

#### Cost Management

- **Token Limits**: Max 500 tokens per response
- **History Trimming**: Only last 10 messages sent to API
- **Message Length**: User messages limited to 5000 characters
- **Error Handling**: Graceful fallbacks prevent unnecessary retry costs

### Error Handling

The LLM service gracefully handles:

- **Invalid API keys (401)**: Returns user-friendly error message
- **Rate limits (429)**: Returns "Rate limit exceeded" message
- **Service outages (500/503)**: Returns "Service temporarily unavailable"
- **Timeouts**: 30-second timeout on all requests
- **Network errors**: Returns generic error message

All errors are caught and never thrown - the service always returns a string response to prevent API crashes.

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
- **Trade-off**: Requires more setup than SQLite, but worth it for production scalability

### Why Separate Services?

- Clear separation of concerns
- LLM service is swappable (could use Anthropic, etc.)
- Chat service handles conversation logic independently
- Easy to test and maintain
- **Trade-off**: Slightly more code, but much better maintainability

### Why localStorage for Sessions?

- No auth required (per requirements)
- Simple, works offline
- Persists across refreshes
- Can be upgraded to server-side sessions later
- **Trade-off**: Not secure for sensitive data, but fine for anonymous chat sessions

### Why gpt-4o-mini?

- **Balanced Performance**: Provides capable contextual answers with good conversational ability
- **Cost-Effective**: Keeps resource usage reasonable for a customer support widget
- **Fast Response Times**: Optimized for speed while maintaining quality
- **Production-Ready**: Well-suited for customer support use cases
- **Trade-off**: Not as capable as GPT-4, but 10x cheaper and faster

### Other Design Decisions

- **Connection Pooling**: Using `pg` Pool with Prisma adapter for better database performance
- **Rate Limiting**: Multi-layer approach (IP, session, daily) prevents abuse while allowing legitimate use
- **History Trimming**: Only last 10 messages sent to LLM - balances context vs. cost
- **No Streaming**: Currently sends complete response - could add streaming for better UX
- **Error Sanitization**: Production errors are sanitized to prevent information leakage

## ⏰ If I Had More Time...

### Immediate Priorities

1. **Testing Suite**

   - Unit tests for services (Jest)
   - Integration tests for API endpoints (Supertest)
   - E2E tests for frontend flows (Playwright)
   - Mock LLM responses for reliable testing

2. **Streaming Responses**

   - Implement Server-Sent Events (SSE) or WebSockets
   - Stream LLM tokens as they're generated
   - Much better UX - users see responses in real-time

3. **Monitoring & Observability**
   - Structured logging (Winston/Pino) with request IDs
   - Error tracking (Sentry)
   - Metrics collection (Prometheus)
   - Performance monitoring

### Enhanced Features

4. **Lazy Loading Messages**

   - Pagination for long conversation histories
   - Load older messages on scroll up
   - Better performance for conversations with 100+ messages

5. **Authentication & Multi-tenancy**

   - User authentication system
   - Support for multiple organizations/tenants
   - Admin dashboard for conversation management

6. **Advanced LLM Features**
   - Function calling for structured actions (e.g., "check order status")
   - RAG (Retrieval Augmented Generation) for knowledge base integration
   - Multi-modal support (images, documents)

### Production Hardening

7. **Infrastructure**

   - Docker containerization
   - Kubernetes deployment configs
   - CI/CD pipeline (GitHub Actions)
   - Automated testing on every PR

8. **Scalability**

   - Redis for distributed rate limiting
   - Message queue (Bull/BullMQ) for async LLM processing
   - Database read replicas
   - CDN for static assets

9. **Cost Optimization**
   - Token usage tracking and analytics
   - Cost alerts for unexpected spikes
   - Caching for common queries
   - Request deduplication

## 💡 Potential Enhancements

### Immediate Improvements

1. **Streaming Responses**: Stream LLM tokens for better UX
2. **Retry Logic**: Automatic retry on transient failures
3. **Logging**: Structured logging (Winston/Pino) with request IDs

### Enhanced Features

1. **Multi-turn Context**: Better conversation context window management
2. **Lazy Loading of Messages**: Load older messages on scroll up for conversations with many messages
   - Implement infinite scroll/pagination when user scrolls to top
   - Fetch previous messages in batches (e.g., 20-50 messages at a time)
   - Maintain scroll position when loading older messages
   - Improve performance for long conversation histories
3. **File Uploads**: Support image/document uploads
4. **Typing Indicators**: More sophisticated typing simulation
5. **Message Reactions**: Thumbs up/down for feedback
6. **Admin Dashboard**: View conversations, analytics
7. **Voice Input**: Audio-to-text (speech-to-text) integration for voice messages
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
