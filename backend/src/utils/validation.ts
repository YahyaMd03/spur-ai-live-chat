import { validate as uuidValidate } from 'uuid';

/**
 * Validates if a string is a valid UUID format
 */
export function isValidUUID(str: string): boolean {
  return uuidValidate(str);
}

/**
 * Validates sessionId format
 */
export function validateSessionId(sessionId: string): void {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new Error('Session ID is required');
  }
  
  if (!isValidUUID(sessionId)) {
    throw new Error('Invalid session ID format');
  }
}

/**
 * Sanitizes error messages for production
 */
export function sanitizeErrorMessage(error: unknown, isProduction: boolean): string {
  if (isProduction) {
    // In production, return generic messages
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('not found') || message.includes('conversation not found')) {
        return 'Conversation not found';
      }
      
      if (message.includes('required') || message.includes('cannot be empty')) {
        return error.message; // Keep validation errors as-is
      }
      
      if (message.includes('api key') || message.includes('invalid')) {
        return 'Service configuration error';
      }
      
      if (message.includes('rate limit')) {
        return 'Rate limit exceeded. Please try again later.';
      }
      
      if (message.includes('database') || message.includes('prisma')) {
        return 'Database error. Please try again later.';
      }
    }
    
    return 'An unexpected error occurred. Please try again later.';
  }
  
  // In development, return the actual error message
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

