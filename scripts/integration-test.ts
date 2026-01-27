/**
 * OP Bridge Integration Test Script
 * Tests deposits and withdrawals on Sepolia <-> OP Sepolia
 * 
 * Prerequisites:
 * - A wallet with Sepolia ETH (for deposits)
 * - A wallet with OP Sepolia ETH (for withdrawals)
 * 
 * Usage:
 * PRIVATE_KEY=0x... npx tsx scripts/integration-test.ts
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { bridgeContracts } from '../src/config/contracts';
import { l2Chain } from '../src/config/chains';

// ABI for L1StandardBridge depositETH
const l1StandardBridgeAbi = [
  {
    name: 'depositETH',
    type: 'function',
    inputs: [
      { name: '_minGasLimit', type: 'uint32' },
      { name: '_extraData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

// ABI for L2StandardBridge withdraw
const l2StandardBridgeAbi = [
  {
    name: 'withdraw',
    type: 'function',
    inputs: [
      { name: '_l2Token', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_minGasLimit', type: 'uint32' },
      { name: '_extraData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

const ETH_ADDRESS = '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000' as const;

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY environment variable required');
    console.log('Usage: PRIVATE_KEY=0x... npx tsx scripts/integration-test.ts');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`\n🔑 Using wallet: ${account.address}\n`);

  // Create clients
  const l1PublicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
  });

  const l2PublicClient = createPublicClient({
    chain: l2Chain,
    transport: http('https://sepolia.optimism.io'),
  });

  const l1WalletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
  });

  const l2WalletClient = createWalletClient({
    account,
    chain: l2Chain,
    transport: http('https://sepolia.optimism.io'),
  });

  // Check balances
  console.log('📊 Checking balances...');
  const l1Balance = await l1PublicClient.getBalance({ address: account.address });
  const l2Balance = await l2PublicClient.getBalance({ address: account.address });
  
  console.log(`   L1 (Sepolia):    ${formatEther(l1Balance)} ETH`);
  console.log(`   L2 (OP Sepolia): ${formatEther(l2Balance)} ETH\n`);

  // Test selection based on balances
  const testAmount = parseEther('0.001'); // 0.001 ETH for testing

  if (l1Balance > testAmount + parseEther('0.01')) {
    // Test deposit (L1 -> L2)
    console.log('🚀 Testing DEPOSIT (L1 -> L2)...');
    console.log(`   Amount: 0.001 ETH`);
    console.log(`   Bridge: ${bridgeContracts.l1.l1StandardBridge}`);
    
    try {
      const depositHash = await l1WalletClient.writeContract({
        address: bridgeContracts.l1.l1StandardBridge,
        abi: l1StandardBridgeAbi,
        functionName: 'depositETH',
        args: [200000, '0x'],
        value: testAmount,
      });

      console.log(`   ✅ Deposit TX submitted: ${depositHash}`);
      console.log(`   📎 View on Etherscan: https://sepolia.etherscan.io/tx/${depositHash}`);
      
      // Wait for confirmation
      console.log('   ⏳ Waiting for L1 confirmation...');
      const receipt = await l1PublicClient.waitForTransactionReceipt({ hash: depositHash });
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
      console.log(`   ℹ️  Deposit will arrive on L2 in ~2-5 minutes\n`);
      
    } catch (error: any) {
      console.error(`   ❌ Deposit failed: ${error.message}\n`);
    }
  } else {
    console.log('⚠️  Insufficient L1 balance for deposit test');
    console.log(`   Need at least 0.011 ETH, have ${formatEther(l1Balance)} ETH`);
    console.log('   Get Sepolia ETH from: https://sepoliafaucet.com\n');
  }

  if (l2Balance > testAmount + parseEther('0.001')) {
    // Test withdrawal (L2 -> L1)
    console.log('🚀 Testing WITHDRAWAL (L2 -> L1)...');
    console.log(`   Amount: 0.001 ETH`);
    console.log(`   Bridge: ${bridgeContracts.l2.l2StandardBridge}`);
    
    try {
      const withdrawHash = await l2WalletClient.writeContract({
        address: bridgeContracts.l2.l2StandardBridge,
        abi: l2StandardBridgeAbi,
        functionName: 'withdraw',
        args: [ETH_ADDRESS, testAmount, 200000, '0x'],
        value: testAmount,
      });

      console.log(`   ✅ Withdrawal TX submitted: ${withdrawHash}`);
      console.log(`   📎 View on OP Etherscan: https://sepolia-optimism.etherscan.io/tx/${withdrawHash}`);
      
      // Wait for confirmation
      console.log('   ⏳ Waiting for L2 confirmation...');
      const receipt = await l2PublicClient.waitForTransactionReceipt({ hash: withdrawHash });
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
      console.log(`   ℹ️  Withdrawal requires 7-day challenge period before finalization\n`);
      
    } catch (error: any) {
      console.error(`   ❌ Withdrawal failed: ${error.message}\n`);
    }
  } else {
    console.log('⚠️  Insufficient L2 balance for withdrawal test');
    console.log(`   Need at least 0.002 ETH, have ${formatEther(l2Balance)} ETH`);
    console.log('   Bridge ETH from L1 first, or use: https://www.alchemy.com/faucets/optimism-sepolia\n');
  }

  // Final balance check
  console.log('📊 Final balances:');
  const finalL1Balance = await l1PublicClient.getBalance({ address: account.address });
  const finalL2Balance = await l2PublicClient.getBalance({ address: account.address });
  console.log(`   L1 (Sepolia):    ${formatEther(finalL1Balance)} ETH`);
  console.log(`   L2 (OP Sepolia): ${formatEther(finalL2Balance)} ETH\n`);

  console.log('✅ Integration test complete!');
}

main().catch(console.error);
