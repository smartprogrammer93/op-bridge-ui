#!/bin/bash
# Auto-check balance and run integration tests when funded
# This script is called by cron to monitor and test

cd /home/smart/clawd/projects/op-bridge-ui

TEST_ADDRESS="0xdb25B53da39f6661B1a6FFE2f664e9D3E2325364"
LOG_FILE="/home/smart/clawd/projects/op-bridge-ui/test-progress.log"

echo "$(date): Checking test wallet balance..." >> "$LOG_FILE"

# Check L1 (Sepolia) balance
L1_BALANCE=$(curl -s -X POST https://ethereum-sepolia-rpc.publicnode.com \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$TEST_ADDRESS\",\"latest\"],\"id\":1}" \
  | jq -r '.result' 2>/dev/null)

# Check L2 (OP Sepolia) balance  
L2_BALANCE=$(curl -s -X POST https://sepolia.optimism.io \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$TEST_ADDRESS\",\"latest\"],\"id\":1}" \
  | jq -r '.result' 2>/dev/null)

echo "  L1 Balance (hex): $L1_BALANCE" >> "$LOG_FILE"
echo "  L2 Balance (hex): $L2_BALANCE" >> "$LOG_FILE"

# Convert hex to decimal and check if > 0.01 ETH (10000000000000000 wei)
MIN_BALANCE="0x2386f26fc10000"  # 0.01 ETH in hex

if [[ "$L1_BALANCE" != "0x0" && "$L1_BALANCE" > "$MIN_BALANCE" ]]; then
    echo "  ✅ L1 has sufficient balance, running deposit test..." >> "$LOG_FILE"
    
    # Run the integration test
    PRIVATE_KEY=0xcf6ebc18ab3148581b2c7de062e5625a0a90cd6f5f2ce08c6325e7694561c096 \
    npx tsx scripts/integration-test.ts >> "$LOG_FILE" 2>&1
    
    # Notify via Clawdbot
    /home/smart/clawd/scripts/clawd-reminder.sh "🧪 Bridge Integration Test completed! Check $LOG_FILE for results" telegram 1784531652
    
    echo "  Test completed at $(date)" >> "$LOG_FILE"
else
    echo "  ⏳ Waiting for funding. Send Sepolia ETH to: $TEST_ADDRESS" >> "$LOG_FILE"
fi

echo "---" >> "$LOG_FILE"
