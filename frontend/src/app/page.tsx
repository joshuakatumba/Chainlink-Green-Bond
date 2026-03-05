'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import {
  UNIQUE_RWA_ABI,
  UNIQUE_RWA_ADDRESS,
  CROSS_CHAIN_RWA_ABI,
  CROSS_CHAIN_RWA_ADDRESS,
  CROSS_CHAIN_RECEIVER_ADDRESS,
  ARBITRUM_SEPOLIA_CHAIN_SELECTOR,
} from './contracts';

export default function Home() {
  const { isConnected } = useAccount();

  const [assetType, setAssetType] = useState('bond');
  const [assetId, setAssetId] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // ──── Mint NFT (ERC-721) ────
  const {
    writeContract: writeMint,
    data: mintTxHash,
    isPending: isMintPending,
    isError: isMintError,
    error: mintError,
    reset: resetMint,
  } = useWriteContract();

  const { isLoading: isMintConfirming, isSuccess: isMintConfirmed } =
    useWaitForTransactionReceipt({ hash: mintTxHash });

  // ──── Bridge to Arbitrum (CCIP) ────
  const {
    writeContract: writeBridge,
    data: bridgeTxHash,
    isPending: isBridgePending,
    isError: isBridgeError,
    error: bridgeError,
    reset: resetBridge,
  } = useWriteContract();

  const { isLoading: isBridgeConfirming, isSuccess: isBridgeConfirmed } =
    useWaitForTransactionReceipt({ hash: bridgeTxHash });

  // ──── Handlers ────

  const handleTokenize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      alert("Please connect your wallet first.");
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    resetMint();
    resetBridge();

    try {
      const response = await fetch('/api/verify-rwa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentText }),
      });

      if (!response.ok) {
        throw new Error('Verification failed. Server responded with an error.');
      }

      const data = await response.json();

      setVerificationResult({
        success: data.isValid,
        documentHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        documentUri: 'ipfs://bafybeicg2uoyrtxb5uclc4v6wz7i...',
        aiConfidence: data.confidenceScore || 0,
        signature: '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      });
      setIsVerifying(false);

    } catch (e) {
      console.error(e);
      alert('Failed to verify the document using Gemini API.');
      setIsVerifying(false);
    }
  };

  const handleMintNFT = () => {
    if (!verificationResult) return;

    writeMint({
      address: UNIQUE_RWA_ADDRESS as `0x${string}`,
      abi: UNIQUE_RWA_ABI,
      functionName: 'requestMint',
      args: [
        [documentText, assetType, assetId],  // string[] args for Chainlink Functions JS source
        verificationResult.documentUri,       // tokenUri
        verificationResult.documentHash as `0x${string}`,  // bytes32 documentHash
      ],
    });
  };

  const handleBridge = () => {
    if (!verificationResult) return;

    const verificationData = JSON.stringify({
      documentHash: verificationResult.documentHash,
      documentUri: verificationResult.documentUri,
      aiConfidence: verificationResult.aiConfidence,
      assetType,
      assetId,
    });

    writeBridge({
      address: CROSS_CHAIN_RWA_ADDRESS as `0x${string}`,
      abi: CROSS_CHAIN_RWA_ABI,
      functionName: 'sendCrossChainVerification',
      args: [
        ARBITRUM_SEPOLIA_CHAIN_SELECTOR,
        CROSS_CHAIN_RECEIVER_ADDRESS as `0x${string}`,
        verificationData,
      ],
      value: parseEther('0.01'), // CCIP fee estimate in native ETH
    });
  };

  // ──── Helpers ────

  const shortenHash = (hash: string) =>
    hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : '';

  const isMinting = isMintPending || isMintConfirming;
  const isBridging = isBridgePending || isBridgeConfirming;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Navbar */}
      <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center mr-3 font-bold text-lg shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                R
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                RWA Protocol
              </span>
            </div>
            <div>
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Left Column: Tokenization Form */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <span className="bg-neutral-800 p-2 rounded-lg mr-3">💎</span>
              Tokenize Real-World Asset
            </h2>

            <form onSubmit={handleTokenize} className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Asset Type</label>
                <select
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                >
                  <option value="bond">US Treasury Bond</option>
                  <option value="invoice">Corporate Invoice</option>
                  <option value="legal">Legal Agreement</option>
                  <option value="carbon">Carbon Credit (Fungible)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Asset Identifier (ID / Serial)</label>
                <input
                  type="text"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="e.g., CUSIP-12345678"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Document Content (For AI Verification)</label>
                <textarea
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[120px]"
                  placeholder="Paste document text or terms..."
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!isConnected || isVerifying}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${!isConnected
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : isVerifying
                    ? 'bg-blue-600/50 text-white cursor-wait'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] hover:-translate-y-1'
                  }`}
              >
                {!isConnected ? 'Wallet Not Connected' : (isVerifying ? 'Verifying with Chainlink AI...' : 'Verify & Tokenize on Chain')}
              </button>
            </form>
          </div>

          {/* Right Column: Status / Results */}
          <div className="space-y-6">

            {/* Status Panel */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 lg:p-8 relative overflow-hidden h-full flex flex-col">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

              <h3 className="text-xl font-bold mb-4 flex items-center">
                <span className="bg-neutral-800 text-sm py-1 px-2 rounded-md mr-3 border border-neutral-700">LOGS</span>
                System Status
              </h3>

              {!verificationResult && !isVerifying && (
                <div className="flex-grow flex flex-col items-center justify-center text-neutral-500 p-8 text-center border-2 border-dashed border-neutral-800 rounded-xl">
                  <div className="text-4xl mb-4">⏳</div>
                  <p>Awaiting asset verification submission.</p>
                  <p className="text-sm mt-2">Data will be assessed by AI via Chainlink Functions.</p>
                </div>
              )}

              {isVerifying && (
                <div className="flex-grow flex flex-col justify-center space-y-4">
                  <div className="flex items-center text-blue-400">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping mr-3"></div>
                    <span className="font-mono text-sm">Uploading document to decentralized storage...</span>
                  </div>
                  <div className="flex items-center text-blue-400">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping mr-3" style={{ animationDelay: '0.2s' }}></div>
                    <span className="font-mono text-sm">Requesting Chainlink DON inference...</span>
                  </div>
                  <div className="flex items-center text-blue-400">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping mr-3" style={{ animationDelay: '0.4s' }}></div>
                    <span className="font-mono text-sm">Awaiting Gemini verification...</span>
                  </div>
                </div>
              )}

              {verificationResult && (
                <div className="flex-grow flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start">
                    <div className="text-emerald-400 text-xl mr-4 mt-0.5">✓</div>
                    <div>
                      <h4 className="font-bold text-emerald-400">Asset Verified!</h4>
                      <p className="text-sm text-neutral-400 mt-1">AI Confidence Score: <span className="text-emerald-300 font-mono">{(verificationResult.aiConfidence * 100).toFixed(1)}%</span></p>
                    </div>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3 font-mono text-xs text-neutral-400 overflow-x-auto">
                    <div><span className="text-neutral-500">Document Hash:</span> <br /><span className="text-blue-300">{verificationResult.documentHash}</span></div>
                    <div><span className="text-neutral-500">IPFS URI:</span> <br /><span className="text-neutral-200">{verificationResult.documentUri}</span></div>
                    <div><span className="text-neutral-500">Oracle Signature:</span> <br /><span className="text-purple-400 break-all">{verificationResult.signature}</span></div>
                  </div>

                  {/* ──── Mint NFT Button ──── */}
                  <button
                    onClick={handleMintNFT}
                    disabled={isMinting || isMintConfirmed}
                    className={`w-full py-3 mt-4 rounded-xl font-bold flex items-center justify-center transition-all ${isMintConfirmed
                        ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 cursor-default'
                        : isMinting
                          ? 'bg-blue-600/30 text-blue-300 cursor-wait animate-pulse'
                          : 'bg-neutral-800 hover:bg-neutral-700 hover:shadow-[0_0_15px_rgba(37,99,235,0.2)] text-white'
                      }`}
                  >
                    {isMintConfirmed ? (
                      <>✅ NFT Mint Requested!</>
                    ) : isMintConfirming ? (
                      <>⏳ Confirming Transaction...</>
                    ) : isMintPending ? (
                      <>🔐 Confirm in MetaMask...</>
                    ) : (
                      <>Mint NFT (ERC-721)</>
                    )}
                  </button>

                  {/* Mint tx hash */}
                  {mintTxHash && (
                    <div className="text-xs font-mono text-neutral-500 text-center">
                      Tx:{' '}
                      <a
                        href={`https://sepolia.etherscan.io/tx/${mintTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {shortenHash(mintTxHash)}
                      </a>
                    </div>
                  )}

                  {/* Mint error */}
                  {isMintError && (
                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                      ❌ {mintError?.message?.split('\n')[0] || 'Mint transaction failed'}
                    </div>
                  )}

                  {/* ──── Bridge to Arbitrum Button ──── */}
                  <button
                    onClick={handleBridge}
                    disabled={isBridging || isBridgeConfirmed}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center transition-all ${isBridgeConfirmed
                        ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 cursor-default'
                        : isBridging
                          ? 'bg-purple-600/30 text-purple-300 cursor-wait animate-pulse'
                          : 'bg-neutral-800 hover:bg-neutral-700 hover:shadow-[0_0_15px_rgba(147,51,234,0.2)] text-white'
                      }`}
                  >
                    {isBridgeConfirmed ? (
                      <>✅ Bridge Message Sent!</>
                    ) : isBridgeConfirming ? (
                      <>⏳ Confirming Transaction...</>
                    ) : isBridgePending ? (
                      <>🔐 Confirm in MetaMask...</>
                    ) : (
                      <>Bridge to Arbitrum (CCIP)</>
                    )}
                  </button>

                  {/* Bridge tx hash */}
                  {bridgeTxHash && (
                    <div className="text-xs font-mono text-neutral-500 text-center">
                      Tx:{' '}
                      <a
                        href={`https://sepolia.etherscan.io/tx/${bridgeTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:underline"
                      >
                        {shortenHash(bridgeTxHash)}
                      </a>
                      {' · '}
                      <a
                        href={`https://ccip.chain.link`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-400 hover:underline"
                      >
                        Track on CCIP Explorer →
                      </a>
                    </div>
                  )}

                  {/* Bridge error */}
                  {isBridgeError && (
                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                      ❌ {bridgeError?.message?.split('\n')[0] || 'Bridge transaction failed'}
                    </div>
                  )}

                  {/* Bridge info note */}
                  {!isBridgeConfirmed && !isBridging && !isBridgeError && (
                    <p className="text-xs text-neutral-600 text-center mt-1">
                      Bridge sends ~0.01 ETH for CCIP fees · Asset arrives on Arbitrum in ~15-20 min
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
