// Contract ABIs and addresses for UniqueRWA and CrossChainRWA
import { getAddress } from 'viem';

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

// ──── ProtocolTreasury (Business Model / Fees) ────
export const PROTOCOL_TREASURY_ABI = [
    {
        name: 'payVerificationFee',
        type: 'function',
        stateMutability: 'payable',
        inputs: [{ name: 'assetId', type: 'string' }],
        outputs: [],
    },
    {
        name: 'verificationFee',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'FeePaid',
        type: 'event',
        inputs: [
            { name: 'payer', type: 'address', indexed: true },
            { name: 'assetId', type: 'string', indexed: false },
            { name: 'amount', type: 'uint256', indexed: false },
        ]
    }
] as const;

// ──── Deployed addresses (normalized to handle Vercel env whitespace) ────

const normalizeAddress = (addr: string | undefined, fallback: `0x${string}`): `0x${string}` => {
    try {
        if (!addr) return getAddress(fallback);
        const cleaned = addr.trim();
        if (!cleaned.startsWith('0x')) return getAddress(fallback);
        return getAddress(cleaned);
    } catch {
        return getAddress(fallback);
    }
};

export const UNIQUE_RWA_ADDRESS = normalizeAddress(
    process.env.NEXT_PUBLIC_UNIQUE_RWA_ADDRESS,
    '0x9737acf063cb5b10b56a72755f66dcd05c758786'
);

export const CROSS_CHAIN_RWA_ADDRESS = normalizeAddress(
    process.env.NEXT_PUBLIC_CROSS_CHAIN_RWA_ADDRESS,
    '0xe97448d8d7a28e042cbf462bc000c31d06556045'
);

export const CROSS_CHAIN_RECEIVER_ADDRESS = normalizeAddress(
    process.env.NEXT_PUBLIC_CROSS_CHAIN_RECEIVER_ADDRESS,
    '0x68d809e7D6a6ADbf08341Fa08F98C276De6f2f48'
);

export const PROTOCOL_TREASURY_ADDRESS = normalizeAddress(
    process.env.NEXT_PUBLIC_PROTOCOL_TREASURY_ADDRESS,
    '0xcf51d83075Edd4Cb0cA8Ec4c0925Bef9bbdE0c5f'
);

// Arbitrum Sepolia CCIP chain selector
export const ARBITRUM_SEPOLIA_CHAIN_SELECTOR = BigInt('3478487238524512106');
