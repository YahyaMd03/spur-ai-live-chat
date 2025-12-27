import { Router, Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { chatLimiter, sessionLimiter, dailyLimiter } from '../middleware/rateLimiter';
import { validateSessionId } from '../utils/validation';
import { sanitizeErrorMessage } from '../utils/validation';

const router = Router();
const chatService = new ChatService();
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Apply multiple layers of rate limiting to chat routes
// Order matters: daily -> per-IP -> per-session (most specific last)
router.use(dailyLimiter); // Daily limit (200 requests/day per IP)
router.use(chatLimiter);  // Per-IP limit (50 requests/15min per IP)
router.use(sessionLimiter); // Per-session limit (20 requests/15min per session)

router.get('/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Validate sessionId format
    validateSessionId(sessionId);

    const result = await chatService.getConversationHistory(sessionId);

    res.json(result);
  } catch (error) {
    const errorMessage = sanitizeErrorMessage(error, isProduction);
    const statusCode = error instanceof Error && (
      error.message.includes('not found') || 
      error.message.includes('required') ||
      error.message.includes('Invalid session ID format')
    )
      ? 404
      : 500;

    res.status(statusCode).json({
      error: errorMessage,
    });
  }
});

router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

    // Validate sessionId format if provided
    if (sessionId) {
      validateSessionId(sessionId);
    }

    const result = await chatService.processMessage({
      message,
      sessionId,
    });

    res.json(result);
  } catch (error) {
    const errorMessage = sanitizeErrorMessage(error, isProduction);
    
    let statusCode = 500;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('required') || msg.includes('cannot be empty') || msg.includes('invalid session')) {
        statusCode = 400;
      } else if (msg.includes('api key') || msg.includes('rate limit')) {
        statusCode = 503;
      } else if (msg.includes('exceeds maximum')) {
        statusCode = 400;
      }
    }

    res.status(statusCode).json({
      error: errorMessage,
    });
  }
});

export default router;

