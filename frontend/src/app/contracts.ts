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
] as const;

// ──── CrossChainRWA (CCIP Bridge) ────
export const CROSS_CHAIN_RWA_ABI = [
    {
        name: 'sendCrossChainVerification',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            { name: 'destinationChainSelector', type: 'uint64' },
            { name: 'receiver', type: 'address' },
            { name: 'verificationData', type: 'string' },
        ],
        outputs: [{ name: 'messageId', type: 'bytes32' }],
    },
] as const;

// ──── Deployed addresses (replace with real ones after deployment) ────
export const UNIQUE_RWA_ADDRESS =
    (process.env.NEXT_PUBLIC_UNIQUE_RWA_ADDRESS as `0x${string}`) ||
    '0x98082a1fc75c2f4303a4fb8e10e6e6891455a2a0';

export const CROSS_CHAIN_RWA_ADDRESS =
    (process.env.NEXT_PUBLIC_CROSS_CHAIN_RWA_ADDRESS as `0x${string}`) ||
    '0x39c8b25053056ddfc928d34d1e9499235aa3e81c';

// Receiver contract on Arbitrum Sepolia
export const CROSS_CHAIN_RECEIVER_ADDRESS =
    (process.env.NEXT_PUBLIC_CROSS_CHAIN_RECEIVER_ADDRESS as `0x${string}`) ||
    '0xc9a25c7e70f0a919c866b1aa7fd02d7a0709ba84';

// Arbitrum Sepolia CCIP chain selector
export const ARBITRUM_SEPOLIA_CHAIN_SELECTOR = BigInt('3478487238524512106');
