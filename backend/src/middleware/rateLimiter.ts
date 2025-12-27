import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for chat endpoints (per IP)
export const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 chat requests per windowMs
  message: 'Too many chat requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-session rate limiter (prevents abuse via multiple sessions)
export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each session to 20 requests per 15 minutes
  message: 'Too many requests for this session. Please wait before sending another message.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Use sessionId from body if available, otherwise fallback to IP
    // This prevents users from creating multiple sessions to bypass limits
    const sessionId = (req.body as any)?.sessionId;
    return sessionId || req.ip || 'unknown';
  },
  skip: (req: Request) => {
    // Skip if it's a GET request (history endpoint doesn't need session limiting)
    return req.method === 'GET';
  },
});

// Daily rate limiter (prevents long-term abuse)
export const dailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 200, // Limit each IP to 200 requests per day
  message: 'Daily request limit exceeded. Please try again tomorrow.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, not just successful ones
});

