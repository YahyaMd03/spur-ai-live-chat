import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are a helpful and friendly customer support agent for an ecommerce store. Your goal is to assist customers with their questions and concerns in a professional, empathetic manner.

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
- For shipping/returns questions, provide clear information based on the store policies above`;

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

type Sender = 'user' | 'ai';

export class LLMService {
  private client: OpenAI;
  private readonly maxTokens = 500;
  // Use OPENAI_MODEL env var or fallback to gpt-3.5-turbo (more widely available)
  private readonly model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  private readonly MAX_HISTORY = 10; // Limit conversation history to prevent token explosion

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.client = new OpenAI({ apiKey });
  }

  async generateResponse(conversationHistory: Array<{ sender: Sender; text: string }>): Promise<string> {
    try {
      // Limit conversation history to prevent token explosion and cost spikes
      const recentHistory = conversationHistory.slice(-this.MAX_HISTORY);

      const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...recentHistory.map((msg) => ({
          role: msg.sender === 'user' ? ('user' as const) : ('assistant' as const),
          content: msg.text,
        })),
      ];

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        max_tokens: this.maxTokens,
        temperature: 0.7, // Balanced creativity for support responses
      });

      // Log the full OpenAI response object
      console.log('OpenAI Response Object:', JSON.stringify(response, null, 2));

      // Defensive response access
      const choice = response.choices?.[0];
      if (!choice || !choice.message?.content) {
        console.error('LLM returned empty or invalid response');
        return 'Sorry, I was unable to generate a response. Please try again.';
      }

      return choice.message.content.trim();
    } catch (error) {
      // Log error for debugging but never throw - always return safe fallback
      console.error('LLM error:', error);

      // Map specific errors to user-friendly messages
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          console.error('Invalid OpenAI API key');
        } else if (error.status === 429) {
          console.error('OpenAI rate limit exceeded');
        } else if (error.status === 500 || error.status === 503) {
          console.error('OpenAI service unavailable');
        }
      }

      // Always return a safe fallback - never throw errors from LLM service
      return 'Our support agent is temporarily unavailable. Please try again shortly.';
    }
  }
}


