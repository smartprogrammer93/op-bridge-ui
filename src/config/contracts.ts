import { Address } from 'viem';

export interface BridgeContracts {
  l1: {
    optimismPortal: Address;
    l1StandardBridge: Address;
    l1CrossDomainMessenger: Address;
    systemConfig: Address;
    disputeGameFactory: Address;
  };
  l2: {
    l2StandardBridge: Address;
    l2CrossDomainMessenger: Address;
    l2ToL1MessagePasser: Address;
  };
}

export const bridgeContracts: BridgeContracts = {
  l1: {
    // REPLACE THESE WITH YOUR DEPLOYMENT ADDRESSES
    optimismPortal: '0x0000000000000000000000000000000000000000',
    l1StandardBridge: '0x0000000000000000000000000000000000000000',
    l1CrossDomainMessenger: '0x0000000000000000000000000000000000000000',
    systemConfig: '0x0000000000000000000000000000000000000000',
    disputeGameFactory: '0x0000000000000000000000000000000000000000',
  },
  l2: {
    // These are standard predeploys (same for all OP Stack chains)
    l2StandardBridge: '0x4200000000000000000000000000000000000010',
    l2CrossDomainMessenger: '0x4200000000000000000000000000000000000007',
    l2ToL1MessagePasser: '0x4200000000000000000000000000000000000016',
  },
};
