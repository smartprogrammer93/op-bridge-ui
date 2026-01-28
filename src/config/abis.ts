import { parseAbi } from 'viem';

/**
 * Centralized ABI definitions for OP Stack bridge contracts
 */

// L2ToL1MessagePasser MessagePassed event
export const MESSAGE_PASSED_ABI = parseAbi([
  'event MessagePassed(uint256 indexed nonce, address indexed sender, address indexed target, uint256 value, uint256 gasLimit, bytes data, bytes32 withdrawalHash)'
]);

// WithdrawalProven event for tracking prove status
export const WITHDRAWAL_PROVEN_EVENT = {
  type: 'event',
  name: 'WithdrawalProven',
  inputs: [
    { name: 'withdrawalHash', type: 'bytes32', indexed: true },
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
  ],
} as const;

// DisputeGameFactory ABI
export const DISPUTE_GAME_FACTORY_ABI = parseAbi([
  'function gameCount() view returns (uint256)',
  'function gameAtIndex(uint256 _index) view returns (uint32 gameType, uint64 timestamp, address proxy)',
  'function findLatestGames(uint32 _gameType, uint256 _start, uint256 _n) view returns ((uint256 index, bytes32 metadata, uint64 timestamp, bytes32 rootClaim, bytes extraData)[])',
]);

// FaultDisputeGame ABI
export const FAULT_DISPUTE_GAME_ABI = parseAbi([
  'function l2BlockNumber() view returns (uint256)',
  'function rootClaim() view returns (bytes32)',
  'function status() view returns (uint8)',
]);

// OptimismPortal2 ABI for fault proofs
export const OPTIMISM_PORTAL_ABI = [
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
    name: 'finalizeWithdrawalTransaction',
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
  {
    name: 'provenWithdrawals',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_withdrawalHash', type: 'bytes32' },
      { name: '_proofSubmitter', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'finalizedWithdrawals',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'numProofSubmitters',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_withdrawalHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// L1StandardBridge ABI
export const L1_STANDARD_BRIDGE_ABI = [
  {
    name: 'bridgeETH',
    type: 'function',
    inputs: [
      { name: '_minGasLimit', type: 'uint32' },
      { name: '_extraData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    name: 'bridgeETHTo',
    type: 'function',
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_minGasLimit', type: 'uint32' },
      { name: '_extraData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    name: 'bridgeERC20',
    type: 'function',
    inputs: [
      { name: '_localToken', type: 'address' },
      { name: '_remoteToken', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_minGasLimit', type: 'uint32' },
      { name: '_extraData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// L2StandardBridge ABI for withdrawals
export const L2_STANDARD_BRIDGE_ABI = parseAbi([
  'function withdraw(address _l2Token, uint256 _amount, uint32 _minGasLimit, bytes calldata _extraData) payable',
  'function withdrawTo(address _l2Token, address _to, uint256 _amount, uint32 _minGasLimit, bytes calldata _extraData) payable',
]);
