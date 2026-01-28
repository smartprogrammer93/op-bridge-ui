/**
 * Standardized error message handling for user-friendly display
 */

// Common error patterns and their user-friendly messages
const ERROR_PATTERNS: Array<{ pattern: RegExp | string; message: string }> = [
  // User actions
  { pattern: /user rejected/i, message: 'Transaction was rejected in your wallet' },
  { pattern: /user denied/i, message: 'Transaction was denied in your wallet' },
  { pattern: /user cancelled/i, message: 'Transaction was cancelled' },
  
  // Insufficient funds
  { pattern: /insufficient funds/i, message: 'Insufficient funds for this transaction' },
  { pattern: /exceeds balance/i, message: 'Amount exceeds your available balance' },
  
  // Network issues
  { pattern: /network/i, message: 'Network error. Please check your connection and try again' },
  { pattern: /timeout/i, message: 'Request timed out. Please try again' },
  { pattern: /rate limit/i, message: 'Too many requests. Please wait a moment and try again' },
  { pattern: /429/i, message: 'Too many requests. Please wait a moment and try again' },
  
  // Contract errors
  { pattern: /execution reverted/i, message: 'Transaction failed. The contract rejected this action' },
  { pattern: /gas required exceeds/i, message: 'Transaction would fail. Please try a smaller amount' },
  { pattern: /nonce too low/i, message: 'Transaction error. Please refresh and try again' },
  
  // Wallet connection
  { pattern: /wallet not connected/i, message: 'Please connect your wallet first' },
  { pattern: /chain mismatch/i, message: 'Please switch to the correct network' },
  { pattern: /unsupported chain/i, message: 'This network is not supported' },
  
  // Bridge-specific errors
  { pattern: /withdrawal not found/i, message: 'Could not find withdrawal data. Please try again' },
  { pattern: /dispute game/i, message: 'Withdrawal is not ready yet. Please wait for the L2 output to be proposed' },
  { pattern: /not ready to prove/i, message: 'Withdrawal is not ready to prove yet. Please wait ~1 hour' },
  { pattern: /not ready to finalize/i, message: 'Withdrawal is not ready to finalize. Challenge period not complete' },
  { pattern: /already proven/i, message: 'This withdrawal has already been proven' },
  { pattern: /already finalized/i, message: 'This withdrawal has already been finalized' },
  { pattern: /could not fetch l2 block/i, message: 'Could not fetch L2 data. The output may not be available yet' },
];

/**
 * Convert a technical error to a user-friendly message
 */
export function getUserFriendlyError(error: unknown): string {
  // Extract error message
  let errorMessage: string;
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String((error as { message: unknown }).message);
  } else {
    return 'An unexpected error occurred. Please try again';
  }
  
  // Check against known patterns
  for (const { pattern, message } of ERROR_PATTERNS) {
    if (typeof pattern === 'string') {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return message;
      }
    } else if (pattern.test(errorMessage)) {
      return message;
    }
  }
  
  // If no pattern matched, return a cleaned-up version of the original
  // Remove technical prefixes and limit length
  const cleaned = errorMessage
    .replace(/^(Error:|Error -|Uncaught Error:)\s*/i, '')
    .replace(/\s*\(.*\)$/, '') // Remove trailing parenthetical info
    .trim();
  
  // If it's too long or looks too technical, return generic message
  if (cleaned.length > 100 || /0x[a-f0-9]{8,}/i.test(cleaned)) {
    return 'Transaction failed. Please try again';
  }
  
  return cleaned || 'An unexpected error occurred. Please try again';
}

/**
 * Check if an error is a user rejection (shouldn't show error UI)
 */
export function isUserRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /user (rejected|denied|cancelled)/i.test(message);
}
