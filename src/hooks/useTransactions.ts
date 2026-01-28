import { useAccount, usePublicClient } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther, parseAbiItem, PublicClient } from 'viem';
import { l1Chain, l2Chain } from '@/config/chains';
import { bridgeContracts } from '@/config/contracts';
import { 
  TRANSACTION_HISTORY_BLOCKS, 
  TRANSACTION_CHUNK_SIZE,
  QUERY_STALE_TIME,
  QUERY_CACHE_TIME,
} from '@/config/constants';

export interface BridgeTransaction {
  type: 'deposit' | 'withdrawal';
  hash: string;
  amount: string;
  timestamp?: number;
  status: 'pending' | 'confirmed' | 'finalized';
  chain: 'l1' | 'l2';
  blockNumber: bigint;
}

// Event signatures for OP Stack bridges
const ETH_BRIDGE_INITIATED = parseAbiItem(
  'event ETHBridgeInitiated(address indexed from, address indexed to, uint256 amount, bytes extraData)'
);

const ETH_WITHDRAWAL_INITIATED = parseAbiItem(
  'event WithdrawalInitiated(address indexed l1Token, address indexed l2Token, address indexed from, address to, uint256 amount, bytes extraData)'
);

// Helper to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch logs with rate limit handling and pagination
async function fetchLogsWithPagination(
  client: PublicClient,
  address: `0x${string}`,
  event: any,
  args: any,
  totalBlocks: number = TRANSACTION_HISTORY_BLOCKS,
  chunkSize: number = TRANSACTION_CHUNK_SIZE
): Promise<any[]> {
  const currentBlock = await client.getBlockNumber();
  const allLogs: any[] = [];
  
  let fromBlock = currentBlock - BigInt(totalBlocks);
  if (fromBlock < BigInt(0)) fromBlock = BigInt(0);
  
  // Create all chunk requests
  const chunks: { from: bigint; to: bigint }[] = [];
  let tempFrom = fromBlock;
  while (tempFrom < currentBlock) {
    const tempTo = tempFrom + BigInt(chunkSize) > currentBlock 
      ? currentBlock 
      : tempFrom + BigInt(chunkSize);
    chunks.push({ from: tempFrom, to: tempTo });
    tempFrom = tempTo + BigInt(1);
  }
  
  // Process chunks in parallel batches of 3
  const batchSize = 3;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (chunk) => {
        let retries = 3;
        while (retries > 0) {
          try {
            return await client.getLogs({
              address,
              event,
              args,
              fromBlock: chunk.from,
              toBlock: chunk.to,
            });
          } catch (err: any) {
            const errorMsg = err?.message || '';
            if (errorMsg.includes('limit') || errorMsg.includes('429') || errorMsg.includes('exceeded')) {
              await sleep(1000);
              retries--;
            } else {
              throw err;
            }
          }
        }
        return [];
      })
    );
    results.forEach(logs => allLogs.push(...logs));
  }
  
  return allLogs;
}

// Fetch function for React Query
async function fetchBridgeTransactions(
  address: `0x${string}`,
  l1Client: PublicClient,
  l2Client: PublicClient
): Promise<{ deposits: BridgeTransaction[]; withdrawals: BridgeTransaction[] }> {
  const [depositLogs, withdrawalLogs] = await Promise.all([
    fetchLogsWithPagination(
      l1Client,
      bridgeContracts.l1.l1StandardBridge,
      ETH_BRIDGE_INITIATED,
      { from: address }
    ),
    fetchLogsWithPagination(
      l2Client,
      bridgeContracts.l2.l2StandardBridge,
      ETH_WITHDRAWAL_INITIATED,
      { from: address }
    ),
  ]);

  const deposits: BridgeTransaction[] = depositLogs.map((log: any) => ({
    type: 'deposit',
    hash: log.transactionHash,
    amount: formatEther(log.args.amount || BigInt(0)),
    status: 'confirmed',
    chain: 'l1',
    blockNumber: log.blockNumber,
  }));
  
  const withdrawals: BridgeTransaction[] = withdrawalLogs.map((log: any) => ({
    type: 'withdrawal',
    hash: log.transactionHash,
    amount: formatEther(log.args.amount || BigInt(0)),
    status: 'pending',
    chain: 'l2',
    blockNumber: log.blockNumber,
  }));
  
  return { deposits, withdrawals };
}

export function useTransactions() {
  const { address } = useAccount();
  const l1Client = usePublicClient({ chainId: l1Chain.id });
  const l2Client = usePublicClient({ chainId: l2Chain.id });
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bridgeTransactions', address],
    queryFn: () => {
      if (!address || !l1Client || !l2Client) {
        return { deposits: [], withdrawals: [] };
      }
      return fetchBridgeTransactions(address, l1Client, l2Client);
    },
    enabled: !!address && !!l1Client && !!l2Client,
    staleTime: QUERY_STALE_TIME,
    gcTime: QUERY_CACHE_TIME,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const deposits = data?.deposits ?? [];
  const withdrawals = data?.withdrawals ?? [];

  return {
    deposits,
    withdrawals,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch transactions') : null,
    refetch,
    allTransactions: [...deposits, ...withdrawals].sort(
      (a, b) => Number(b.blockNumber) - Number(a.blockNumber)
    ),
    // Utility to invalidate cache after a new transaction
    invalidateCache: () => queryClient.invalidateQueries({ queryKey: ['bridgeTransactions', address] }),
  };
}
