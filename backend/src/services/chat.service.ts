import { prisma } from '../db/prisma';
import { LLMService } from './llm.service';
import { validateSessionId } from '../utils/validation';

type Sender = 'user' | 'ai';

export interface ChatMessage {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
}

export interface ConversationHistory {
  messages: Array<{
    id: string;
    sender: Sender;
    text: string;
    createdAt: Date;
  }>;
  sessionId: string;
}

export class ChatService {
  private llmService: LLMService;
  private readonly MAX_MESSAGE_LENGTH = 5000;

  constructor() {
    this.llmService = new LLMService();
  }

  async processMessage(input: ChatMessage): Promise<ChatResponse> {
    // Validate input
    if (!input.message || typeof input.message !== 'string') {
      throw new Error('Message is required and must be a string');
    }

    const trimmedMessage = input.message.trim();
    if (trimmedMessage.length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (trimmedMessage.length > this.MAX_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds maximum length of ${this.MAX_MESSAGE_LENGTH} characters`);
    }

    try {
      // Get or create conversation
      let conversationId: string;
      if (input.sessionId) {
        // Validate sessionId format
        validateSessionId(input.sessionId);
        
        // Verify conversation exists
        const existing = await prisma.conversation.findUnique({
          where: { id: input.sessionId },
        });
        if (!existing) {
          // Create new conversation if sessionId is invalid
          const newConversation = await prisma.conversation.create({});
          conversationId = newConversation.id;
        } else {
          conversationId = input.sessionId;
        }
      } else {
        const newConversation = await prisma.conversation.create({});
        conversationId = newConversation.id;
      }

      // Save user message
      await prisma.message.create({
        data: {
          conversationId,
          sender: 'user',
          text: trimmedMessage,
        },
      });

      // Get conversation history
      const history = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        select: {
          sender: true,
          text: true,
        },
      });

      // Convert to typed format for LLM service
      const typedHistory: Array<{ sender: Sender; text: string }> = history.map((msg) => ({
        sender: (msg.sender === 'user' || msg.sender === 'ai' ? msg.sender : 'ai') as Sender,
        text: msg.text,
      }));

      // Generate AI response (LLM service never throws - always returns a string)
      const aiReply = await this.llmService.generateResponse(typedHistory);

      // Save AI response
      await prisma.message.create({
        data: {
          conversationId,
          sender: 'ai',
          text: aiReply,
        },
      });

      return {
        reply: aiReply,
        sessionId: conversationId,
      };
    } catch (error) {
      // Re-throw validation errors and LLM errors as-is
      if (error instanceof Error && (
        error.message.includes('required') ||
        error.message.includes('cannot be empty') ||
        error.message.includes('exceeds maximum') ||
        error.message.includes('API key') ||
        error.message.includes('Rate limit')
      )) {
        throw error;
      }
      // Wrap database errors
      throw new Error('Database error. Please try again later.');
    }
  }

  async getConversationHistory(sessionId: string): Promise<ConversationHistory> {
    // Validate sessionId format
    validateSessionId(sessionId);

    try {
      // Verify conversation exists
      const conversation = await prisma.conversation.findUnique({
        where: { id: sessionId },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Get all messages for this conversation
      const messages = await prisma.message.findMany({
        where: { conversationId: sessionId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          sender: true,
          text: true,
          createdAt: true,
        },
      });

      // Type-safe conversion: ensure sender is 'user' | 'ai'
      const typedMessages = messages.map((msg) => ({
        id: msg.id,
        sender: (msg.sender === 'user' || msg.sender === 'ai' ? msg.sender : 'ai') as Sender,
        text: msg.text,
        createdAt: msg.createdAt,
      }));

      return {
        messages: typedMessages,
        sessionId,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to fetch conversation history');
    }
  }
}

