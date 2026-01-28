import { Hash, decodeEventLog, PublicClient } from 'viem';
import { MESSAGE_PASSED_ABI } from '@/config/abis';
import { bridgeContracts } from '@/config/contracts';
import { DEFAULT_RETRY_COUNT, DEFAULT_RETRY_DELAY_MS } from '@/config/constants';

/**
 * Withdrawal transaction structure
 */
export interface WithdrawalTransaction {
  nonce: bigint;
  sender: `0x${string}`;
  target: `0x${string}`;
  value: bigint;
  gasLimit: bigint;
  data: `0x${string}`;
  withdrawalHash: `0x${string}`;
}

/**
 * Output root proof structure
 */
export interface OutputRootProof {
  version: `0x${string}`;
  stateRoot: `0x${string}`;
  messagePasserStorageRoot: `0x${string}`;
  latestBlockhash: `0x${string}`;
}

/**
 * Retry wrapper for async functions with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = DEFAULT_RETRY_COUNT,
  delayMs: number = DEFAULT_RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      const errorMsg = lastError.message.toLowerCase();
      if (
        errorMsg.includes('user rejected') ||
        errorMsg.includes('user denied') ||
        errorMsg.includes('insufficient funds')
      ) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Extract withdrawal data from an L2 transaction receipt
 */
export async function getWithdrawalFromTx(
  l2Client: PublicClient,
  l2TxHash: Hash
): Promise<{ withdrawal: WithdrawalTransaction; blockNumber: bigint } | null> {
  try {
    const receipt = await withRetry(() => 
      l2Client.getTransactionReceipt({ hash: l2TxHash })
    );
    
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === bridgeContracts.l2.l2ToL1MessagePasser.toLowerCase()) {
        try {
          const decoded = decodeEventLog({
            abi: MESSAGE_PASSED_ABI,
            data: log.data,
            topics: log.topics,
          });
          
          if (decoded.eventName === 'MessagePassed') {
            return {
              withdrawal: {
                nonce: decoded.args.nonce,
                sender: decoded.args.sender,
                target: decoded.args.target,
                value: decoded.args.value,
                gasLimit: decoded.args.gasLimit,
                data: decoded.args.data as `0x${string}`,
                withdrawalHash: decoded.args.withdrawalHash,
              },
              blockNumber: receipt.blockNumber,
            };
          }
        } catch {
          // Not the right event, continue
          continue;
        }
      }
    }
    return null;
  } catch (err) {
    console.error('Failed to get withdrawal from tx:', err);
    return null;
  }
}

/**
 * Type guard to validate bigint values from contract calls
 */
export function isBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}

/**
 * Type guard to validate hex string
 */
export function isHexString(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && value.startsWith('0x');
}

/**
 * Safe bigint conversion with validation
 */
export function toBigIntSafe(value: unknown, fallback: bigint = 0n): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string') {
    try {
      return BigInt(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Validate game at index response
 */
export function validateGameAtIndex(
  result: unknown
): { gameType: number; timestamp: bigint; proxy: `0x${string}` } | null {
  if (!Array.isArray(result) || result.length < 3) {
    return null;
  }
  
  const [gameType, timestamp, proxy] = result;
  
  if (
    typeof gameType !== 'number' &&
    typeof gameType !== 'bigint'
  ) {
    return null;
  }
  
  if (!isHexString(proxy)) {
    return null;
  }
  
  return {
    gameType: Number(gameType),
    timestamp: toBigIntSafe(timestamp),
    proxy: proxy as `0x${string}`,
  };
}
