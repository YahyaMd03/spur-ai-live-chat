import { Request, Response, NextFunction } from 'express';

const REQUEST_TIMEOUT = 30000; // 30 seconds

export const timeoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timeout. Please try again.',
      });
    }
  }, REQUEST_TIMEOUT);

  res.on('finish', () => {
    clearTimeout(timeout);
  });

  next();
};

