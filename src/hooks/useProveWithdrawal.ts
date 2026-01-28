import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { useState, useCallback } from 'react';
import { Hash, toHex, keccak256, encodeAbiParameters } from 'viem';
import { l1Chain, l2Chain } from '@/config/chains';
import { bridgeContracts } from '@/config/contracts';
import { 
  OPTIMISM_PORTAL_ABI, 
  DISPUTE_GAME_FACTORY_ABI, 
  FAULT_DISPUTE_GAME_ABI 
} from '@/config/abis';
import { DISPUTE_GAME_BATCH_SIZE } from '@/config/constants';
import { 
  WithdrawalTransaction, 
  OutputRootProof,
  getWithdrawalFromTx,
  withRetry,
  validateGameAtIndex,
  toBigIntSafe,
} from '@/lib/withdrawal-utils';
import { sepolia } from 'viem/chains';

export function useProveWithdrawal() {
  const l1Client = usePublicClient({ chainId: l1Chain.id });
  const l2Client = usePublicClient({ chainId: l2Chain.id });
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  
  const [hash, setHash] = useState<Hash | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get withdrawal from L2 tx - uses shared utility
  const getWithdrawalFromTxCallback = useCallback(async (l2TxHash: Hash) => {
    if (!l2Client) return null;
    return getWithdrawalFromTx(l2Client, l2TxHash);
  }, [l2Client]);

  // Find a dispute game that covers the L2 block
  const findDisputeGame = useCallback(async (l2BlockNumber: bigint): Promise<{ gameIndex: bigint; gameProxy: `0x${string}`; l2Block: bigint } | null> => {
    if (!l1Client) return null;
    
    try {
      // Get the respected game type from OptimismPortal2
      const gameType = await withRetry(() => 
        l1Client.readContract({
          address: bridgeContracts.l1.optimismPortal,
          abi: OPTIMISM_PORTAL_ABI,
          functionName: 'respectedGameType',
        })
      );
      
      // Get total game count
      const gameCount = await withRetry(() =>
        l1Client.readContract({
          address: bridgeContracts.l1.disputeGameFactory,
          abi: DISPUTE_GAME_FACTORY_ABI,
          functionName: 'gameCount',
        })
      );
      
      const gameCountBigInt = toBigIntSafe(gameCount);
      if (gameCountBigInt === 0n) return null;
      
      // Search backwards from latest games to find one that covers our block
      const batchSize = BigInt(DISPUTE_GAME_BATCH_SIZE);
      const start = gameCountBigInt > batchSize ? gameCountBigInt - batchSize : 0n;
      
      for (let i = gameCountBigInt - 1n; i >= start; i--) {
        try {
          const rawResult = await l1Client.readContract({
            address: bridgeContracts.l1.disputeGameFactory,
            abi: DISPUTE_GAME_FACTORY_ABI,
            functionName: 'gameAtIndex',
            args: [i],
          });
          
          const validated = validateGameAtIndex(rawResult);
          if (!validated) continue;
          
          const { gameType: gType, proxy } = validated;
          
          // Skip if wrong game type
          if (gType !== Number(gameType)) continue;
          
          // Get the L2 block number this game covers
          const gameL2Block = await l1Client.readContract({
            address: proxy,
            abi: FAULT_DISPUTE_GAME_ABI,
            functionName: 'l2BlockNumber',
          });
          
          const gameL2BlockBigInt = toBigIntSafe(gameL2Block);
          
          // Check if this game covers our withdrawal block
          if (gameL2BlockBigInt >= l2BlockNumber) {
            // Check game status (0 = IN_PROGRESS, 1 = CHALLENGER_WINS, 2 = DEFENDER_WINS)
            const status = await l1Client.readContract({
              address: proxy,
              abi: FAULT_DISPUTE_GAME_ABI,
              functionName: 'status',
            });
            
            // Only use resolved games where defender won (status = 2)
            // For OP Sepolia testnet, we might need to allow IN_PROGRESS games
            if (Number(status) === 2 || Number(status) === 0) {
              return { gameIndex: i, gameProxy: proxy, l2Block: gameL2BlockBigInt };
            }
          }
        } catch {
          // Skip games that fail to read
          continue;
        }
      }
      
      return null;
    } catch (err) {
      console.error('Failed to find dispute game:', err);
      return null;
    }
  }, [l1Client]);

  // Check if withdrawal is ready to prove
  const canProve = useCallback(async (l2BlockNumber: bigint): Promise<{ ready: boolean; gameIndex?: bigint; gameProxy?: `0x${string}` }> => {
    const game = await findDisputeGame(l2BlockNumber);
    if (game) {
      return { ready: true, gameIndex: game.gameIndex, gameProxy: game.gameProxy };
    }
    return { ready: false };
  }, [findDisputeGame]);

  // Get the storage proof for the withdrawal
  const getStorageProof = useCallback(async (withdrawalHash: `0x${string}`, blockNumber: bigint): Promise<`0x${string}`[]> => {
    if (!l2Client) throw new Error('No L2 client');
    
    // Calculate the storage slot for the withdrawal in L2ToL1MessagePasser
    // sentMessages mapping is at slot 0
    const slot = keccak256(
      encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'uint256' }],
        [withdrawalHash, BigInt(0)]
      )
    );
    
    // Get the proof with retry
    const proof = await withRetry(() =>
      l2Client.request({
        method: 'eth_getProof',
        params: [
          bridgeContracts.l2.l2ToL1MessagePasser,
          [slot],
          toHex(blockNumber),
        ],
      })
    );
    
    return proof.storageProof[0].proof as `0x${string}`[];
  }, [l2Client]);

  // Get output root proof
  const getOutputRootProof = useCallback(async (l2BlockNumber: bigint): Promise<OutputRootProof> => {
    if (!l2Client) throw new Error('No L2 client');
    
    // Get the block to construct the proof
    const block = await withRetry(() =>
      l2Client.request({
        method: 'eth_getBlockByNumber',
        params: [toHex(l2BlockNumber), false],
      })
    );
    
    if (!block) throw new Error('Could not fetch L2 block');
    
    // Get the L2ToL1MessagePasser storage root
    const proof = await withRetry(() =>
      l2Client.request({
        method: 'eth_getProof',
        params: [
          bridgeContracts.l2.l2ToL1MessagePasser,
          [],
          toHex(l2BlockNumber),
        ],
      })
    );
    
    if (!block.hash || !block.stateRoot) {
      throw new Error('Block missing required fields');
    }
    
    return {
      version: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      stateRoot: block.stateRoot as `0x${string}`,
      messagePasserStorageRoot: proof.storageHash as `0x${string}`,
      latestBlockhash: block.hash as `0x${string}`,
    };
  }, [l2Client]);

  // Prove the withdrawal
  const prove = useCallback(async (l2TxHash: Hash) => {
    if (!walletClient || !address) throw new Error('Wallet not connected');
    
    setIsPending(true);
    setError(null);
    setIsSuccess(false);
    
    try {
      const result = await getWithdrawalFromTxCallback(l2TxHash);
      if (!result) throw new Error('Could not find withdrawal in transaction');
      
      const { withdrawal, blockNumber } = result;
      
      // Find a dispute game
      const game = await findDisputeGame(blockNumber);
      if (!game) {
        throw new Error('No dispute game found for this withdrawal. The L2 output may not be proposed yet. Please wait and try again.');
      }
      
      // Get output root proof at the game's L2 block
      const outputRootProof = await getOutputRootProof(game.l2Block);
      
      // Get storage proof at the game's L2 block
      const withdrawalProof = await getStorageProof(withdrawal.withdrawalHash, game.l2Block);
      
      // Submit prove transaction
      const txHash = await walletClient.writeContract({
        address: bridgeContracts.l1.optimismPortal,
        abi: OPTIMISM_PORTAL_ABI,
        functionName: 'proveWithdrawalTransaction',
        args: [
          {
            nonce: withdrawal.nonce,
            sender: withdrawal.sender,
            target: withdrawal.target,
            value: withdrawal.value,
            gasLimit: withdrawal.gasLimit,
            data: withdrawal.data,
          },
          game.gameIndex,
          outputRootProof,
          withdrawalProof,
        ],
        chain: sepolia,
      });
      
      setHash(txHash);
      setIsPending(false);
      setIsConfirming(true);
      
      // Wait for confirmation
      const receipt = await l1Client!.waitForTransactionReceipt({ hash: txHash });
      
      setIsConfirming(false);
      setIsSuccess(receipt.status === 'success');
      
      if (receipt.status !== 'success') {
        throw new Error('Transaction failed');
      }
    } catch (err) {
      setIsPending(false);
      setIsConfirming(false);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  }, [walletClient, address, l1Client, getWithdrawalFromTxCallback, findDisputeGame, getOutputRootProof, getStorageProof]);

  return {
    prove,
    getWithdrawalFromTx: getWithdrawalFromTxCallback,
    canProve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
