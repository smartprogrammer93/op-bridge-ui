import { Address } from 'viem';

export interface BridgeContracts {
  l1: {
    optimismPortal: Address;
    l1StandardBridge: Address;
    l1CrossDomainMessenger: Address;
    l2OutputOracle: Address;
    systemConfig: Address;
    disputeGameFactory: Address;
  };
  l2: {
    l2StandardBridge: Address;
    l2CrossDomainMessenger: Address;
    l2ToL1MessagePasser: Address;
  };
}

// OP Sepolia L1 Contract Addresses (on Sepolia Ethereum)
// Source: https://github.com/ethereum-optimism/superchain-registry
export const bridgeContracts: BridgeContracts = {
  l1: {
    optimismPortal: '0x16Fc5058F25648194471939df75CF27A2fdC48BC',
    l1StandardBridge: '0xFBb0621E0B23b5478B630BD55a5f21f67730B0F1',
    l1CrossDomainMessenger: '0x58Cc85b8D04EA49cC6DBd3CbFFd00B4B8D6cb3ef',
    l2OutputOracle: '0x90E9c4f8a994a250F6aEfd61CAFb4F2e895D458F', // OP Sepolia L2OutputOracle
    systemConfig: '0x034edD2A225f7f429A63E0f1D2084B9E0A93b538',
    disputeGameFactory: '0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1',
  },
  l2: {
    // Standard predeploys (same for all OP Stack chains)
    l2StandardBridge: '0x4200000000000000000000000000000000000010',
    l2CrossDomainMessenger: '0x4200000000000000000000000000000000000007',
    l2ToL1MessagePasser: '0x4200000000000000000000000000000000000016',
  },
};
