import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { useState, useCallback } from 'react';
import { Hash, decodeEventLog, parseAbi, createPublicClient, http, toHex, keccak256, encodeAbiParameters } from 'viem';
import { getWithdrawals } from 'viem/op-stack';
import { l1Chain, l2Chain } from '@/config/chains';
import { bridgeContracts } from '@/config/contracts';
import { sepolia } from 'viem/chains';

// L2ToL1MessagePasser MessagePassed event
const messagePassedAbi = parseAbi([
  'event MessagePassed(uint256 indexed nonce, address indexed sender, address indexed target, uint256 value, uint256 gasLimit, bytes data, bytes32 withdrawalHash)'
]);

// DisputeGameFactory ABI
const disputeGameFactoryAbi = parseAbi([
  'function gameCount() view returns (uint256)',
  'function gameAtIndex(uint256 _index) view returns (uint32 gameType, uint64 timestamp, address proxy)',
  'function findLatestGames(uint32 _gameType, uint256 _start, uint256 _n) view returns ((uint256 index, bytes32 metadata, uint64 timestamp, bytes32 rootClaim, bytes extraData)[])',
]);

// FaultDisputeGame ABI
const faultDisputeGameAbi = parseAbi([
  'function l2BlockNumber() view returns (uint256)',
  'function rootClaim() view returns (bytes32)',
  'function status() view returns (uint8)',
]);

// OptimismPortal2 ABI for fault proofs
const optimismPortal2Abi = [
  {
    name: 'proveWithdrawalTransaction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: '_tx',
        type: 'tuple',
        components: [
          { name: 'nonce', type: 'uint256' },
          { name: 'sender', type: 'address' },
          { name: 'target', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'gasLimit', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      },
      { name: '_disputeGameIndex', type: 'uint256' },
      {
        name: '_outputRootProof',
        type: 'tuple',
        components: [
          { name: 'version', type: 'bytes32' },
          { name: 'stateRoot', type: 'bytes32' },
          { name: 'messagePasserStorageRoot', type: 'bytes32' },
          { name: 'latestBlockhash', type: 'bytes32' },
        ],
      },
      { name: '_withdrawalProof', type: 'bytes[]' },
    ],
    outputs: [],
  },
  {
    name: 'disputeGameFactory',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'respectedGameType',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint32' }],
  },
] as const;

export interface WithdrawalTransaction {
  nonce: bigint;
  sender: `0x${string}`;
  target: `0x${string}`;
  value: bigint;
  gasLimit: bigint;
  data: `0x${string}`;
  withdrawalHash: `0x${string}`;
}

export interface OutputRootProof {
  version: `0x${string}`;
  stateRoot: `0x${string}`;
  messagePasserStorageRoot: `0x${string}`;
  latestBlockhash: `0x${string}`;
}

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

  // Get withdrawal from L2 tx
  const getWithdrawalFromTx = useCallback(async (l2TxHash: Hash): Promise<{ withdrawal: WithdrawalTransaction; blockNumber: bigint } | null> => {
    if (!l2Client) return null;
    
    try {
      const receipt = await l2Client.getTransactionReceipt({ hash: l2TxHash });
      
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === bridgeContracts.l2.l2ToL1MessagePasser.toLowerCase()) {
          try {
            const decoded = decodeEventLog({
              abi: messagePassedAbi,
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
            continue;
          }
        }
      }
      return null;
    } catch (err) {
      console.error('Failed to get withdrawal:', err);
      return null;
    }
  }, [l2Client]);

  // Find a dispute game that covers the L2 block
  const findDisputeGame = useCallback(async (l2BlockNumber: bigint): Promise<{ gameIndex: bigint; gameProxy: `0x${string}`; l2Block: bigint } | null> => {
    if (!l1Client) return null;
    
    try {
      // Get the respected game type from OptimismPortal2
      const gameType = await l1Client.readContract({
        address: bridgeContracts.l1.optimismPortal,
        abi: optimismPortal2Abi,
        functionName: 'respectedGameType',
      }) as number;
      
      // Get total game count
      const gameCount = await l1Client.readContract({
        address: bridgeContracts.l1.disputeGameFactory,
        abi: disputeGameFactoryAbi,
        functionName: 'gameCount',
      }) as bigint;
      
      if (gameCount === 0n) return null;
      
      // Search backwards from latest games to find one that covers our block
      // Check last 100 games (should be enough)
      const batchSize = 50;
      const start = gameCount > BigInt(batchSize) ? gameCount - BigInt(batchSize) : 0n;
      
      for (let i = gameCount - 1n; i >= start; i--) {
        try {
          const [gType, timestamp, proxy] = await l1Client.readContract({
            address: bridgeContracts.l1.disputeGameFactory,
            abi: disputeGameFactoryAbi,
            functionName: 'gameAtIndex',
            args: [i],
          }) as [number, bigint, `0x${string}`];
          
          // Skip if wrong game type
          if (gType !== gameType) continue;
          
          // Get the L2 block number this game covers
          const gameL2Block = await l1Client.readContract({
            address: proxy,
            abi: faultDisputeGameAbi,
            functionName: 'l2BlockNumber',
          }) as bigint;
          
          // Check if this game covers our withdrawal block
          if (gameL2Block >= l2BlockNumber) {
            // Check game status (0 = IN_PROGRESS, 1 = CHALLENGER_WINS, 2 = DEFENDER_WINS)
            const status = await l1Client.readContract({
              address: proxy,
              abi: faultDisputeGameAbi,
              functionName: 'status',
            }) as number;
            
            // Only use resolved games where defender won (status = 2)
            // For OP Sepolia testnet, we might need to allow IN_PROGRESS games
            if (status === 2 || status === 0) {
              return { gameIndex: i, gameProxy: proxy, l2Block: gameL2Block };
            }
          }
        } catch (e) {
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
    
    // Get the proof
    const proof = await l2Client.request({
      method: 'eth_getProof',
      params: [
        bridgeContracts.l2.l2ToL1MessagePasser,
        [slot],
        toHex(blockNumber),
      ],
    });
    
    return proof.storageProof[0].proof as `0x${string}`[];
  }, [l2Client]);

  // Get output root proof
  const getOutputRootProof = useCallback(async (l2BlockNumber: bigint): Promise<OutputRootProof> => {
    if (!l2Client) throw new Error('No L2 client');
    
    // Get the block to construct the proof
    const block = await l2Client.request({
      method: 'eth_getBlockByNumber',
      params: [toHex(l2BlockNumber), false],
    });
    
    if (!block) throw new Error('Could not fetch L2 block');
    
    // Get the L2ToL1MessagePasser storage root
    const proof = await l2Client.request({
      method: 'eth_getProof',
      params: [
        bridgeContracts.l2.l2ToL1MessagePasser,
        [],
        toHex(l2BlockNumber),
      ],
    });
    
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
      const result = await getWithdrawalFromTx(l2TxHash);
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
        abi: optimismPortal2Abi,
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
  }, [walletClient, address, l1Client, getWithdrawalFromTx, findDisputeGame, getOutputRootProof, getStorageProof]);

  return {
    prove,
    getWithdrawalFromTx,
    canProve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
