/**
 * OP Bridge Withdrawal Test
 * Run this after the deposit has arrived on L2
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bridgeContracts } from '../src/config/contracts';
import { l2Chain } from '../src/config/chains';

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
    console.error('❌ PRIVATE_KEY required');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`\n🔑 Wallet: ${account.address}\n`);

  const l2PublicClient = createPublicClient({
    chain: l2Chain,
    transport: http('https://sepolia.optimism.io'),
  });

  const l2WalletClient = createWalletClient({
    account,
    chain: l2Chain,
    transport: http('https://sepolia.optimism.io'),
  });

  // Check L2 balance
  const l2Balance = await l2PublicClient.getBalance({ address: account.address });
  console.log(`📊 L2 (OP Sepolia) Balance: ${formatEther(l2Balance)} ETH\n`);

  const testAmount = parseEther('0.0005'); // 0.0005 ETH for withdrawal test

  if (l2Balance < testAmount + parseEther('0.0005')) {
    console.log('⏳ Waiting for deposit to arrive on L2...');
    console.log('   Run this script again in a few minutes.');
    process.exit(0);
  }

  // Test withdrawal
  console.log('🚀 Testing WITHDRAWAL (L2 -> L1)...');
  console.log(`   Amount: 0.0005 ETH`);
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
    console.log(`   📎 View: https://sepolia-optimism.etherscan.io/tx/${withdrawHash}`);

    console.log('   ⏳ Waiting for L2 confirmation...');
    const receipt = await l2PublicClient.waitForTransactionReceipt({ hash: withdrawHash });
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`   ℹ️  Withdrawal requires 7-day challenge period before finalization`);
    console.log('\n✅ WITHDRAWAL TEST PASSED!\n');
  } catch (error: any) {
    console.error(`   ❌ Withdrawal failed: ${error.message}\n`);
  }
}

main().catch(console.error);
