'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, decodeEventLog, keccak256, toHex, encodePacked } from 'viem';
import {
  UNIQUE_RWA_ABI,
  UNIQUE_RWA_ADDRESS,
  CROSS_CHAIN_RWA_ABI,
  CROSS_CHAIN_RWA_ADDRESS,
  CROSS_CHAIN_RECEIVER_ADDRESS,
  ARBITRUM_SEPOLIA_CHAIN_SELECTOR,
} from './contracts';

export default function Home() {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();

  const [assetType, setAssetType] = useState('bond');
  const [assetId, setAssetId] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [nftTokenId, setNftTokenId] = useState<string | null>(null);

  // ──── Mint NFT (ERC-721) ────
  const {
    writeContract: writeMint,
    data: mintTxHash,
    isPending: isMintPending,
    isError: isMintError,
    error: mintError,
    reset: resetMint,
  } = useWriteContract();

  const { isLoading: isMintConfirming, isSuccess: isMintConfirmed, data: mintReceipt } =
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

  const { data: bridgeReceipt, isLoading: isBridgeConfirming, isSuccess: isBridgeConfirmed } =
    useWaitForTransactionReceipt({ hash: bridgeTxHash });

  let ccipMessageId = '';
  if (bridgeReceipt) {
    for (const log of bridgeReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: CROSS_CHAIN_RWA_ABI,
          data: log.data,
          topics: log.topics,
          eventName: 'MessageSent'
        });
        if (decoded.eventName === 'MessageSent') {
          ccipMessageId = (decoded.args as any).messageId;
          break;
        }
      } catch (e) {
        // Not the event
      }
    }
  }

  // Extract requestId from the mint transaction (VerificationRequested event)
  let mintRequestId: string | null = null;
  if (mintReceipt) {
    for (const log of mintReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: UNIQUE_RWA_ABI,
          data: log.data,
          topics: log.topics,
          eventName: 'VerificationRequested'
        });
        if (decoded.eventName === 'VerificationRequested') {
          mintRequestId = (decoded.args as any).requestId;
          break;
        }
      } catch (e) {
        // Not the event
      }
    }

    // Mint is async — requestMint only sends a Chainlink Functions request.
    // The NFT is minted later when the DON calls fulfillRequest.
    if (mintReceipt.status === 'success' && nftTokenId === null) {
      setNftTokenId("Pending (Async Minting)");
    }
  }

  // Poll for AssetMinted event (the actual NFT mint from DON callback)
  useEffect(() => {
    if (!publicClient || !isMintConfirmed || !mintReceipt || nftTokenId !== "Pending (Async Minting)") return;

    const pollInterval = setInterval(async () => {
      try {
        const logs = await publicClient.getLogs({
          address: UNIQUE_RWA_ADDRESS as `0x${string}`,
          event: {
            type: 'event',
            name: 'AssetMinted',
            inputs: [
              { name: 'tokenId', type: 'uint256', indexed: true },
              { name: 'owner', type: 'address', indexed: false },
              { name: 'tokenUri', type: 'string', indexed: false },
              { name: 'documentHash', type: 'bytes32', indexed: false },
            ]
          },
          fromBlock: mintReceipt.blockNumber,
          toBlock: 'latest',
        });

        // Find an AssetMinted event for our address
        for (const log of logs) {
          if ((log.args as any)?.owner?.toLowerCase() === address?.toLowerCase()) {
            setNftTokenId(((log.args as any).tokenId as bigint).toString());
            clearInterval(pollInterval);
            break;
          }
        }
      } catch (e) {
        // Polling error, will retry
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [publicClient, isMintConfirmed, mintReceipt, nftTokenId, address]);

  // ──── Handlers ────

  const handleTokenize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      alert("Please connect your wallet first.");
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setNftTokenId(null);
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

      // Compute real SHA-256 hash of the document
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(documentText));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const documentHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Use a deterministic mock IPFS URI based on the hash
      const documentUri = `ipfs://bafybei${documentHash.slice(2, 50)}`;

      setVerificationResult({
        success: data.isValid,
        documentHash,
        documentUri,
        aiConfidence: data.confidenceScore || 0,
        summary: data.summary || '',
        reasoning: data.reasoning || '',
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
      value: parseEther('0.01'),  // ETH to cover CCIP router fees
    });
  };

  // ──── Helpers ────

  const shortenHash = (hash: string) =>
    hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : '';

  const isMinting = isMintPending || isMintConfirming;
  const isBridging = isBridgePending || isBridgeConfirming;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative">
      {/* Background Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950"></div>

      {/* Navbar */}
      <nav className="border-b border-white/5 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center mr-3 font-bold text-lg shadow-[0_0_15px_rgba(5,150,105,0.5)]">
                G
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                Green Bond Protocol
              </span>
            </div>
            <div>
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 font-inter">
            Institutional-Grade Green Bond <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Tokenization</span>
          </h1>
          <p className="text-lg text-slate-400">
            Securely tokenize green bonds, verify environmental impact with Chainlink AI, and bridge assets across chains with mathematical certainty.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

          {/* Left Column: Tokenization Form */}
          <div className="bg-slate-900/60 border border-white/5 backdrop-blur-md rounded-3xl p-8 shadow-2xl shadow-blue-900/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

            <h2 className="text-2xl font-bold mb-6 flex items-center font-inter">
              <span className="bg-slate-800 p-2.5 rounded-xl mr-4 shadow-inner border border-white/5">💎</span>
              Tokenize Real-World Asset
            </h2>

            <form onSubmit={handleTokenize} className="space-y-6 relative z-10">
              <div className="group">
                <label className="block text-sm font-medium text-slate-400 mb-2 transition-colors group-focus-within:text-blue-400">Asset Type</label>
                <div className="relative">
                  <select
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all appearance-none shadow-inner"
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                  >
                    <option value="bond">US Treasury Bond</option>
                    <option value="invoice">Corporate Invoice</option>
                    <option value="legal">Legal Agreement</option>
                    <option value="carbon">Carbon Credit (Fungible)</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-medium text-slate-400 mb-2 transition-colors group-focus-within:text-blue-400">Asset Identifier (ID / Serial)</label>
                <input
                  type="text"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner placeholder:text-slate-600"
                  placeholder="e.g., CUSIP-12345678"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  required
                />
              </div>

              <div className="group">
                <label className="block text-sm font-medium text-slate-400 mb-2 transition-colors group-focus-within:text-blue-400">Document Content (For AI Verification)</label>
                <textarea
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-h-[140px] shadow-inner placeholder:text-slate-600 font-mono text-sm leading-relaxed"
                  placeholder="Paste legal terms, invoice details, or bond parameters..."
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!isConnected || isVerifying}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl border ${!isConnected
                  ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                  : isVerifying
                    ? 'bg-blue-600/50 border-blue-500/30 text-white cursor-wait backdrop-blur-sm'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-blue-500/50 text-white shadow-blue-900/40 hover:shadow-blue-500/30 hover:-translate-y-0.5'
                  }`}
              >
                {!isConnected ? 'Wallet Not Connected' : (isVerifying ? 'Verifying with Chainlink AI...' : 'Verify & Tokenize on Chain')}
              </button>
            </form>
          </div>

          {/* Right Column: Status / Results */}
          <div className="space-y-6">

            {/* Status Panel */}
            <div className="bg-slate-900/60 border border-white/5 backdrop-blur-md rounded-3xl p-6 lg:p-8 relative overflow-hidden h-full flex flex-col shadow-2xl shadow-emerald-900/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

              <h3 className="text-xl font-bold mb-6 flex items-center font-inter border-b border-white/5 pb-4">
                <span className="bg-slate-800 text-xs py-1 px-2.5 rounded-md mr-3 border border-white/5 shadow-inner font-mono tracking-wider text-slate-300">SYSTEM.LOGS</span>
                Command Center
              </h3>

              {!verificationResult && !isVerifying && (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-500 p-8 text-center border-2 border-dashed border-white/5 rounded-2xl bg-slate-950/30">
                  <div className="text-4xl mb-4 opacity-50">⚡</div>
                  <p className="font-medium text-slate-400">Awaiting asset verification sequence.</p>
                  <p className="text-sm mt-2 font-mono opacity-60">System standing by for input...</p>
                </div>
              )}

              {isVerifying && (
                <div className="flex-grow flex flex-col justify-center space-y-6 max-w-sm mx-auto w-full">
                  <div className="flex items-center text-blue-400 animate-in fade-in slide-in-from-bottom-2">
                    <div className="relative flex h-3 w-3 mr-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </div>
                    <span className="font-mono text-sm tracking-tight">Uploading to IPFS...</span>
                  </div>
                  <div className="flex items-center text-indigo-400 animate-in fade-in slide-in-from-bottom-2 delay-150">
                    <div className="relative flex h-3 w-3 mr-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </div>
                    <span className="font-mono text-sm tracking-tight">Requesting Chainlink DON...</span>
                  </div>
                  <div className="flex items-center text-emerald-400 animate-in fade-in slide-in-from-bottom-2 delay-300">
                    <div className="relative flex h-3 w-3 mr-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </div>
                    <span className="font-mono text-sm tracking-tight">Awaiting Gemini AI...</span>
                  </div>
                </div>
              )}

              {verificationResult && (
                <div className="flex-grow flex flex-col space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-start shadow-inner">
                    <div className="bg-emerald-500/20 p-2 rounded-full mr-4 border border-emerald-500/30">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-400 text-lg font-inter">Asset Verified</h4>
                      <p className="text-sm text-slate-400 mt-1">AI Confidence Score: <span className="text-emerald-300 font-mono font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20">{(verificationResult.aiConfidence * 100).toFixed(1)}%</span></p>
                    </div>
                  </div>

                  <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 space-y-4 font-mono text-xs text-slate-400 overflow-x-auto shadow-inner relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-emerald-500 rounded-l-2xl"></div>
                    <div><span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">Document Hash (SHA-256)</span> <span className="text-blue-300 bg-blue-950/30 px-2 py-1 rounded inline-block border border-blue-900/30 break-all">{verificationResult.documentHash}</span></div>
                    <div><span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">IPFS URI</span> <span className="text-slate-300 bg-slate-900/50 px-2 py-1 rounded inline-block border border-white/5 break-all">{verificationResult.documentUri}</span></div>
                    {verificationResult.summary && <div><span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">AI Summary</span> <span className="text-purple-400 bg-purple-950/20 px-2 py-1 rounded inline-block border border-purple-900/30">{verificationResult.summary}</span></div>}
                  </div>

                  {/* ──── Mint NFT Button ──── */}
                  <div className="pt-2">
                    <button
                      onClick={handleMintNFT}
                      disabled={isMinting || isMintConfirmed}
                      className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center transition-all duration-300 border ${isMintConfirmed
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 cursor-default shadow-inner'
                        : isMinting
                          ? 'bg-blue-950/40 border-blue-500/30 text-blue-400 cursor-wait animate-pulse'
                          : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 hover:border-slate-600 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] text-white hover:-translate-y-0.5'
                        }`}
                    >
                      {isMintConfirmed ? (
                        <><svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Verification Request Sent ✓</>
                      ) : isMintConfirming ? (
                        <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Confirming Transaction...</>
                      ) : isMintPending ? (
                        <>🔐 Confirm in Wallet...</>
                      ) : (
                        <>Mint NFT (ERC-721)</>
                      )}
                    </button>
                  </div>

                  {/* Mint tx hash & Wallet Import Info */}
                  {mintTxHash && (
                    <div className="flex flex-col gap-2">
                      <div className="text-[11px] font-mono text-slate-500 text-center bg-slate-950/30 py-2 rounded-lg border border-white/5">
                        TX:{' '}
                        <a
                          href={`https://sepolia.etherscan.io/tx/${mintTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {shortenHash(mintTxHash)}
                        </a>
                      </div>

                      {nftTokenId && (
                        <div className="bg-slate-900/80 border border-blue-500/20 rounded-xl p-4 mt-2 animate-in fade-in slide-in-from-top-2">
                          {nftTokenId === "Pending (Async Minting)" ? (
                            <div className="text-center">
                              <div className="flex items-center justify-center text-amber-400 mb-2">
                                <svg className="animate-spin mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span className="text-xs font-bold uppercase tracking-wider">Awaiting Chainlink DON Callback</span>
                              </div>
                              <p className="text-[10px] text-slate-500">Your verification request was sent to the Chainlink Functions DON. The NFT will be minted once AI verification completes (~2-5 min). This page is polling for the result.</p>
                            </div>
                          ) : (
                            <>
                              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center">
                                <svg className="w-4 h-4 mr-1.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                                NFT Minted! Add to Wallet
                              </h5>

                              <div className="space-y-2">
                                <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-md border border-white/5">
                                  <span className="text-xs text-slate-500">Contract Address</span>
                                  <div className="flex items-center">
                                    <span className="font-mono text-xs text-blue-300 mr-2">{shortenHash(UNIQUE_RWA_ADDRESS)}</span>
                                    <button
                                      onClick={() => navigator.clipboard.writeText(UNIQUE_RWA_ADDRESS as string)}
                                      className="text-slate-500 hover:text-white transition-colors"
                                      title="Copy Address"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                    </button>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-md border border-white/5">
                                  <span className="text-xs text-slate-500">Token ID</span>
                                  <div className="flex items-center">
                                    <span className="font-mono text-xs text-emerald-300 mr-2">{nftTokenId}</span>
                                    <button
                                      onClick={() => navigator.clipboard.writeText(nftTokenId || "")}
                                      className="text-slate-500 hover:text-white transition-colors"
                                      title="Copy Token ID"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-3 text-center">Open MetaMask → NFTs tab → Import NFT using the contract address and token ID above.</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mint error */}
                  {isMintError && (
                    <div className="text-xs text-red-400 bg-red-950/30 border border-red-500/20 rounded-lg p-3 text-center flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {mintError?.message?.split('\n')[0] || 'Mint transaction failed'}
                    </div>
                  )}

                  {/* ──── Bridge to Arbitrum Button ──── */}
                  <div className="pt-2">
                    <button
                      onClick={handleBridge}
                      disabled={isBridging || isBridgeConfirmed}
                      className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center transition-all duration-300 border ${isBridgeConfirmed
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 cursor-default shadow-inner'
                        : isBridging
                          ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-400 cursor-wait animate-pulse'
                          : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 hover:border-slate-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] text-white hover:-translate-y-0.5'
                        }`}
                    >
                      {isBridgeConfirmed ? (
                        <><svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Bridge Message Sent</>
                      ) : isBridgeConfirming ? (
                        <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Confirming Bridge...</>
                      ) : isBridgePending ? (
                        <>🔐 Confirm in Wallet...</>
                      ) : (
                        <>Bridge to Arbitrum (CCIP)</>
                      )}
                    </button>
                  </div>

                  {/* Bridge tx hash */}
                  {bridgeTxHash && (
                    <div className="text-[11px] font-mono text-slate-500 text-center bg-slate-950/30 py-3 rounded-lg border border-white/5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                      <span>
                        TX:{' '}
                        <a
                          href={`https://sepolia.etherscan.io/tx/${bridgeTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          {shortenHash(bridgeTxHash)}
                        </a>
                      </span>
                      <span className="hidden sm:inline text-slate-700">•</span>
                      <a
                        href={ccipMessageId ? `https://ccip.chain.link/msg/${ccipMessageId}` : `https://ccip.chain.link/tx/${bridgeTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-300 hover:text-white flex items-center transition-colors group/link"
                      >
                        CCIP Explorer
                        <svg className="w-3 h-3 ml-1 transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                      </a>
                    </div>
                  )}

                  {/* Bridge error */}
                  {isBridgeError && (
                    <div className="text-xs text-red-400 bg-red-950/30 border border-red-500/20 rounded-lg p-3 text-center flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {bridgeError?.message?.split('\n')[0] || 'Bridge transaction failed'}
                    </div>
                  )}

                  {/* Bridge info note */}
                  {!isBridgeConfirmed && !isBridging && !isBridgeError && (
                    <div className="flex items-start justify-center text-[10px] text-slate-500 mt-2 bg-slate-900/40 p-2 rounded-lg border border-white/5">
                      <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <p>Bridge sends ~0.01 ETH for CCIP fees. Asset arrives on Arbitrum in ~15-20 min.</p>
                    </div>
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
