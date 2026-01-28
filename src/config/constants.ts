/**
 * Centralized constants for the bridge application
 */

// Gas limits
export const DEPOSIT_GAS_LIMIT = 200_000;
export const WITHDRAW_GAS_LIMIT = 200_000;

// Challenge period (7 days in seconds)
export const CHALLENGE_PERIOD_SECONDS = 7 * 24 * 60 * 60;

// Block search ranges
export const PROVE_EVENT_SEARCH_BLOCKS = 50_000;
export const TRANSACTION_HISTORY_BLOCKS = 30_000;
export const TRANSACTION_CHUNK_SIZE = 2_000;

// Dispute game settings
export const DISPUTE_GAME_BATCH_SIZE = 50;

// Minimum amounts (in ETH)
export const MIN_DEPOSIT_ETH = 0.0001;
export const MIN_WITHDRAW_ETH = 0.0001;

// Gas reserves (in ETH)
export const L1_GAS_RESERVE_ETH = 0.005;
export const L2_GAS_RESERVE_ETH = 0.00005;

// Retry settings
export const DEFAULT_RETRY_COUNT = 3;
export const DEFAULT_RETRY_DELAY_MS = 1000;

// Cache settings (in milliseconds)
export const QUERY_STALE_TIME = 60 * 1000; // 1 minute
export const QUERY_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
