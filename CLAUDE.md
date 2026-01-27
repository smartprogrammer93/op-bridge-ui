# Claude Code Instructions

## Project: OP Stack Bridge UI

This is a Next.js bridge UI for an OP Stack L2 blockchain.

## How to Work

1. **Read `DEVELOPMENT_PLAN.md` first** - It contains the complete spec and all code
2. **Execute tasks in order** - Phase 1 → Phase 2 → ... → Phase 7
3. **Test after each phase** - Run `pnpm dev` to verify the app compiles
4. **Don't modify the plan** - Follow it exactly unless there's an error

## Key Files

- `DEVELOPMENT_PLAN.md` - Complete development spec with all code
- `src/config/contracts.ts` - **REQUIRES** L1 contract addresses from deployment
- `src/config/chains.ts` - **REQUIRES** L2 chain configuration
- `.env.local` - **REQUIRES** environment variables

## Commands

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

## Critical Notes

1. **L2 Predeploy addresses are FIXED** - Don't change them
2. **L1 addresses must come from deployment** - Placeholder `0x...` values must be replaced
3. **WalletConnect Project ID required** - Get from cloud.walletconnect.com
4. **Test on Sepolia first** - Don't deploy to mainnet without testing

## After Setup

The user will provide:
- L1 contract addresses
- L2 chain ID
- L2 RPC URL
- WalletConnect Project ID

Wait for these before finalizing configuration.
