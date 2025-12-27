# Project Structure

```
spur-ai-chat-app/
├── backend/                    # Express + TypeScript backend
│   ├── src/
│   │   ├── db/
│   │   │   └── prisma.ts      # Prisma client singleton
│   │   ├── services/
│   │   │   ├── chat.service.ts # Conversation & message logic
│   │   │   └── llm.service.ts  # OpenAI integration
│   │   ├── routes/
│   │   │   └── chat.routes.ts  # POST /chat/message endpoint
│   │   └── index.ts            # Express server entry point
│   ├── prisma/
│   │   └── schema.prisma       # Database schema (Conversation, Message)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example            # Environment variables template
│
├── frontend/                   # Next.js 14 App Router frontend
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ChatWidget.tsx      # Main chat component
│   │   └── ChatWidget.module.css # Chat widget styles
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── .env.example            # Environment variables template
│
├── README.md                   # Comprehensive documentation
└── PROJECT_STRUCTURE.md        # This file
```

## Key Files

### Backend

- **`src/index.ts`**: Express server setup, middleware, route mounting
- **`src/services/chat.service.ts`**: Core business logic for processing messages
- **`src/services/llm.service.ts`**: OpenAI API integration with error handling
- **`src/routes/chat.routes.ts`**: API route handler for `/chat/message`
- **`prisma/schema.prisma`**: Database models (Conversation, Message)

### Frontend

- **`app/page.tsx`**: Main page that renders ChatWidget
- **`components/ChatWidget.tsx`**: Full-featured chat UI component
- **`components/ChatWidget.module.css`**: Styled chat interface

## Data Flow

1. User types message → Frontend sends POST to `/chat/message`
2. Backend validates input → ChatService processes message
3. ChatService saves user message → Fetches conversation history
4. LLMService generates response → ChatService saves AI reply
5. Backend returns `{ reply, sessionId }` → Frontend displays message
6. SessionId persisted in localStorage for continuity
