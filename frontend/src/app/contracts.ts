// Contract ABIs and addresses for UniqueRWA and CrossChainRWA

// ──── UniqueRWA (ERC-721 + Chainlink Functions) ────
export const UNIQUE_RWA_ABI = [
    {
        name: 'requestMint',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'args', type: 'string[]' },
            { name: 'tokenUri', type: 'string' },
            { name: 'documentHash', type: 'bytes32' },
        ],
        outputs: [{ name: 'requestId', type: 'bytes32' }],
    },
    {
        name: 'VerificationRequested',
        type: 'event',
        inputs: [
            { name: 'requestId', type: 'bytes32', indexed: true },
            { name: 'requester', type: 'address', indexed: false },
            { name: 'tokenUri', type: 'string', indexed: false },
        ]
    },
    {
        name: 'AssetMinted',
        type: 'event',
        inputs: [
            { name: 'tokenId', type: 'uint256', indexed: true },
            { name: 'owner', type: 'address', indexed: false },
            { name: 'tokenUri', type: 'string', indexed: false },
            { name: 'documentHash', type: 'bytes32', indexed: false },
        ]
    },
    {
        name: 'Transfer',
        type: 'event',
        inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'tokenId', type: 'uint256', indexed: true }
        ]
    }
] as const;

// ──── CrossChainRWA (CCIP Bridge) ────
export const CROSS_CHAIN_RWA_ABI = [
    {
        name: 'sendCrossChainVerification',
        type: 'function',
        stateMutability: 'payable',   // Changed from 'nonpayable' — contract needs ETH for CCIP fees
        inputs: [
            { name: 'destinationChainSelector', type: 'uint64' },
            { name: 'receiver', type: 'address' },
            { name: 'verificationData', type: 'string' },
        ],
        outputs: [{ name: 'messageId', type: 'bytes32' }],
    },
    {
        name: 'MessageSent',
        type: 'event',
        inputs: [
            { name: 'messageId', type: 'bytes32', indexed: true },
            { name: 'destinationChainSelector', type: 'uint64', indexed: true }
        ]
    }
] as const;

// ──── Deployed addresses (corrected to match broadcast/DeployAll.s.sol) ────
// UniqueRWA = 0x39c8b2... | CrossChainRWA = 0xc9a25c...
export const UNIQUE_RWA_ADDRESS =
    (process.env.NEXT_PUBLIC_UNIQUE_RWA_ADDRESS as `0x${string}`) ||
    '0x9737acf063cb5b10b56a72755f66dcd05c758786';

export const CROSS_CHAIN_RWA_ADDRESS =
    (process.env.NEXT_PUBLIC_CROSS_CHAIN_RWA_ADDRESS as `0x${string}`) ||
    '0xe97448d8d7a28e042cbf462bc000c31d06556045';

// Receiver contract on Arbitrum Sepolia
export const CROSS_CHAIN_RECEIVER_ADDRESS =
    (process.env.NEXT_PUBLIC_CROSS_CHAIN_RECEIVER_ADDRESS as `0x${string}`) ||
    '0x68d809e7D6a6ADbf08341Fa08F98C276De6f2f48';

// Arbitrum Sepolia CCIP chain selector
export const ARBITRUM_SEPOLIA_CHAIN_SELECTOR = BigInt('3478487238524512106');
