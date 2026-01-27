import { useAccount, usePublicClient } from 'wagmi';
import { useEffect, useState, useCallback } from 'react';
import { formatEther, parseAbiItem } from 'viem';
import { l1Chain, l2Chain } from '@/config/chains';
import { bridgeContracts } from '@/config/contracts';

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
  client: any,
  address: `0x${string}`,
  event: any,
  args: any,
  totalBlocks: number = 30000,
  chunkSize: number = 2000
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

export function useTransactions() {
  const { address } = useAccount();
  const l1Client = usePublicClient({ chainId: l1Chain.id });
  const l2Client = usePublicClient({ chainId: l2Chain.id });
  
  const [deposits, setDeposits] = useState<BridgeTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<BridgeTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!address || !l1Client || !l2Client) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch deposits and withdrawals in parallel
      console.log('Fetching transactions...');
      
      const [depositLogs, withdrawalLogs] = await Promise.all([
        fetchLogsWithPagination(
          l1Client,
          bridgeContracts.l1.l1StandardBridge,
          ETH_BRIDGE_INITIATED,
          { from: address },
          30000,
          2000
        ),
        fetchLogsWithPagination(
          l2Client,
          bridgeContracts.l2.l2StandardBridge,
          ETH_WITHDRAWAL_INITIATED,
          { from: address },
          30000,
          2000
        ),
      ]);

      const depositTxs: BridgeTransaction[] = depositLogs.map((log: any) => ({
        type: 'deposit',
        hash: log.transactionHash,
        amount: formatEther(log.args.amount || BigInt(0)),
        status: 'confirmed',
        chain: 'l1',
        blockNumber: log.blockNumber,
      }));
      
      const withdrawalTxs: BridgeTransaction[] = withdrawalLogs.map((log: any) => ({
        type: 'withdrawal',
        hash: log.transactionHash,
        amount: formatEther(log.args.amount || BigInt(0)),
        status: 'pending',
        chain: 'l2',
        blockNumber: log.blockNumber,
      }));
      
      setDeposits(depositTxs);
      setWithdrawals(withdrawalTxs);
      console.log(`Found ${depositTxs.length} deposits, ${withdrawalTxs.length} withdrawals`);
      
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  }, [address, l1Client, l2Client]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    deposits,
    withdrawals,
    isLoading,
    error,
    refetch: fetchTransactions,
    allTransactions: [...deposits, ...withdrawals].sort(
      (a, b) => Number(b.blockNumber) - Number(a.blockNumber)
    ),
  };
}
