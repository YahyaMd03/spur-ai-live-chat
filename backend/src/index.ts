import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat.routes';
import { apiLimiter } from './middleware/rateLimiter';
import { timeoutMiddleware } from './middleware/timeout';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration - restrict to frontend URL
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? frontendUrl.split(',').map(url => url.trim()) // Support multiple origins in production
    : ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow localhost in development
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security middleware
app.use(timeoutMiddleware);
app.use(express.json({ limit: '100kb' })); // Reduced from 10mb to 100kb
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Apply rate limiting to all routes
app.use(apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/chat', chatRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isProduction = NODE_ENV === 'production';
  
  // Log full error in development, sanitized in production
  if (isProduction) {
    console.error('Unhandled error:', err.name, err.message);
  } else {
    console.error('Unhandled error:', err);
  }
  
  res.status(500).json({
    error: 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

