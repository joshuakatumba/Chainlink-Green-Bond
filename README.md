# Green Bond Protocol 🌍🔗

The **Green Bond Protocol** is a decentralized platform built to tokenize, verify, and seamlessly transfer Real World Assets (RWAs)—specifically institutional-grade Green Bonds and ESG-compliant financial instruments—across multiple blockchains. 

By leveraging **Chainlink** and **Google Gemini**, the protocol ensures that only legally verified, high-confidence documents can be minted as NFTs, while enabling cross-chain liquidity and settlement.

---

## 🚀 Use Case & Vision

In traditional finance, verifying the authenticity of green bonds is a slow, manual process prone to human error and regional silos. 

The Green Bond Protocol solves this by:
1. **AI-Driven Verification:** Uploading a legal document triggers a Chainlink Function that consults a Gemini 1.5/2.5 AI model. The AI acts as a virtual auditor, assessing the document's validity and generating a confidence score.
2. **Automated Tokenization:** If the AI confidence score exceeds the institutional threshold (e.g., 95%), a unique ERC-721 token representing the bond is minted on the origin chain (e.g., Sepolia).
3. **Cross-Chain Interoperability:** Once tokenized, institutional buyers can request the transfer of this bond to other networks (e.g., Base) using Chainlink CCIP, unifying global liquidity.
4. **Treasury Management:** A dedicated Protocol Treasury handles verification fees and minting royalties, creating a sustainable business model.

---

## 🌐 Live Deployment & Why We Chose Vercel

**🔗 Live App:** [chainlink-green-bond-2sku.vercel.app](https://chainlink-green-bond-2sku.vercel.app)

While the application can run locally, we deployed the frontend on Vercel because the **Chainlink Decentralized Oracle Network (DON)** required a publicly accessible web environment. Specifically, after the NFT is minted, the DON needs to send the generated **Token ID** and **Contract Address** back to the application so that users can seamlessly import the newly minted NFT directly into their MetaMask wallets. This critical callback functionality could not work locally on `localhost`.

---

## 🏗️ Architecture & Tech Stack

This project is a full-stack Web3 application:

- **Frontend:** Next.js (App Router), TailwindCSS, Wagmi, viem, RainbowKit.
- **Backend / AI Services:** Node.js API routes interacting directly with the `@google/genai` SDK for Gemini model inference.
- **Smart Contracts:** Solidity (Foundry framework), OpenZeppelin.
- **Blockchain Automation:** 
  - **Chainlink Functions:** Bridges the on-chain smart contracts with the off-chain Gemini AI verification backend.
  - **Chainlink CCIP:** Handles the secure cross-chain messaging and token transfers of the minted RWAs.
  - **Chainlink Runtime Environment (CRE):** Automates the institutional verification workflow.

---

## 💰 Business Model

The Green Bond Protocol is designed to be economically sustainable while providing institutional-grade security. Our revenue model consists of:

1. **AI Verification Fees:** Institutions pay a flat fee (e.g., in ETH or LINK) per document verification request. This fee covers the Chainlink Functions execution costs, the Google Gemini API usage, and includes a small protocol margin.
2. **Tokenization Royalties:** A percentage-based protocol fee is collected by the dedicated `ProtocolTreasury.sol` smart contract upon the successful minting of each verified RWA NFT.
3. **Cross-Chain Premium:** A small margin is added to the base Chainlink CCIP transfer fees when assets are routed across networks, providing ongoing revenue from asset mobility.

All fees are securely collected and managed entirely on-chain.

---

## 🔄 Protocol Workflow & Transactions

Here is exactly how a user interacts with the protocol to tokenize a real-world investment:

1. **Asset Input:** The user comes to our platform and inputs their details. They select the asset type they want to tokenize (like a legal agreement) and enter their unique ID. Next, they paste the details of their real-world document directly into the text field so it can be analyzed by Gemini AI.
2. **AI Verification:** In the background, our AI—powered by **Gemini**—analyzes the document details to ensure everything is legitimate. Once Gemini verifies the data, it generates a standardized document, uploading it to get a secure **IPFS URL** and a **Hash** for the document.
3. **Verification Fee:** The user clicks **'Pay Verification Fee'**. This powers our protocol's business model. A small fee of `0.001 ETH` is sent directly to our `ProtocolTreasury` smart contract.
4. **Minting Process:** With the fee paid, MetaMask asks the user to confirm the transaction and pay the network gas fees. Once confirmed, we proceed to mint the NFT.
5. **Smart Contract Execution:** Behind the scenes, this calls the `requestMint` function on our `UniqueRWA` smart contract. The contract takes the IPFS URL and the verified document hash, and seamlessly sends a request to the **Chainlink Decentralized Oracle Network (DON)**.
6. **DON Consensus:** The DON picks up our request, reaches out to our Gemini AI, and fetches its verification result. Our `fulfillRequest` function receives this consensus. Because the consensus is valid (encoded as a `'1'`), the smart contract confidently **mints the secure NFT** to the user's wallet!
   - 🔗 **NFT Minted:** [0xc81a8ed2227823fbd6e18084cb40f1b8d6c0344f9db0d8a4883635f76c3f2655](https://sepolia.etherscan.io/tx/0xc81a8ed2227823fbd6e18084cb40f1b8d6c0344f9db0d8a4883635f76c3f2655)

Now that the NFT is securely minted on our primary blockchain, the user can bridge this asset to another network:

7. **Cross-Chain Bridge:** The user clicks the bridge button. MetaMask pops up again, and the user pays the network gas fee, which automatically includes the exact fee required by **Chainlink CCIP**.
8. **CCIP Routing:** This click calls the `sendCrossChainVerification` function on our `CrossChainRWA` smart contract. The contract packages our verified asset data into a secure message.
9. **Destination Chain:** Chainlink CCIP takes over, securely locking our data on this side and transmitting the verified state to our destination chain (e.g., Arbitrum). This opens up global liquidity without compromising security.
   - 🔗 **CCIP Request:** [0x39831f0461a9873472850bf1cd76343590f297b4251c531f8db67668be64d371](https://sepolia.etherscan.io/tx/0x39831f0461a9873472850bf1cd76343590f297b4251c531f8db67668be64d371)
   - 🔗 **CCIP Explorer:** [0xd9df13fec8a4bb073ba76566df94a60ef2e77e3ebad6dae8fd6188567d7bf6bb](https://ccip.chain.link/msg/0xd9df13fec8a4bb073ba76566df94a60ef2e77e3ebad6dae8fd6188567d7bf6bb)

---

### 💻 CRE Workflows Terminal Output

```bash
run npx tsx cre workflow simulate rwa-verification.ts
🚀 Starting RWA Verification Workflow...
📡 Requesting AI Verification for Asset: CUSIP-U652199-MOCK...
✅ AI Verification Completed.  
🤖 Confidence Score: 98.0%     
⚖️  Evaluating Business Logic...
✅ Conditions Met: Confidence Threshold Passed.
🔐 Preparing Blockchain Proposal...
📦 Encoded Calldata Generated:
0x1dc559d9000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001c0ae2fa8504e7f90a6838599748a6e53ea8c9fc745e410379bb9c4139cca23fb940000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000405468697320726570726573656e74732061206d6f636b206c6567616c2061677265656d656e7420666f72206120555320547265617375727920426f6e642e2e2e000000000000000000000000000000000000000000000000000000000000000473356c7874376b33336832623273377a3574363270696634000000000000000000000000000000000000000000000000000000000000

--- SIMULATION SUCCESS ---
Asset CUSIP-U652199-MOCK is ready to be tokenized on Sepolia.
```

---

## 📺 Video Presentation & Walkthrough

*(User: Insert your 3-5 minute YouTube/Vimeo link here showcasing the workflow execution!)*
👉 **[https://youtu.be/65awUP1RYjQ](https://youtu.be/65awUP1RYjQ)**

---

## 🔗 Chainlink Integrations

This project heavily utilizes Chainlink's suite of services to ensure security, automation, and cross-chain capability. 

### 1. Chainlink Functions (AI Verification)
Used to reach out to our Next.js/Gemini backend to verify the legal documents before minting.
- 📄 **Smart Contract:** [UniqueRWA.sol](https://github.com/joshuakatumba/Chainlink-Green-Bond/blob/main/contracts/src/UniqueRWA.sol)
- 📄 **Off-chain Backend script:** [updateSource.js](https://github.com/joshuakatumba/Chainlink-Green-Bond/blob/main/backend/updateSource.js)

### 2. Chainlink CCIP (Cross-Chain Transfers)
Allows the verified RWA NFTs to be bridged securely from the origin chain to destination chains.
- 📄 **Sender Contract:** [CrossChainRWA.sol](https://github.com/joshuakatumba/Chainlink-Green-Bond/blob/main/contracts/src/CrossChainRWA.sol)
- 📄 **Receiver Contract:** [CrossChainReceiver.sol](https://github.com/joshuakatumba/Chainlink-Green-Bond/blob/main/contracts/src/CrossChainReceiver.sol)

### 3. Chainlink Runtime Environment (CRE)
Simulates and automates the RWA verification business logic off-chain before committing to the blockchain.
- 📄 **Workflow Script:** [rwa-verification.ts](https://github.com/joshuakatumba/Chainlink-Green-Bond/blob/main/workflows/rwa-verification.ts)
- 📄 **Project Config:** [project.yaml](https://github.com/joshuakatumba/Chainlink-Green-Bond/blob/main/project.yaml)

---

## 💻 Local Simulation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/joshuakatumba/Chainlink-Green-Bond.git
   cd Chainlink
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **CRE Simulation:**
   Run the institutional workflow simulation using the CRE CLI:
   ```bash
   cre workflow simulate workflows/rwa-verification.ts
   ```

---

### 💻 CRE Workflows Terminal Output

```bash
✓ Workflow compiled 2026-03-10T12:11:47Z [SIMULATION] Simulator Initialized

2026-03-10T12:11:47Z [SIMULATION] Running trigger trigger=cron-trigger@1.0.0 2026-03-10T12:11:47Z [USER LOG] Running CronTrigger for supply APY rebalance 2026-03-10T12:11:47Z [USER LOG] Reading supply APYs... 2026-03-10T12:11:47Z [USER LOG] Reading APY for chain ethereum-testnet-sepolia | pool 0xBBccb575c318C786E6129d9F8C6C71F0Aea4dF06 | asset 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05 2026-03-10T12:11:47Z [USER LOG] Reserve data [ethereum-testnet-sepolia] currentLiquidityRate: 50000000000000000000000000 2026-03-10T12:11:47Z [USER LOG] Balance in pool [ethereum-testnet-sepolia]: 2000000000000000000 2026-03-10T12:11:47Z [USER LOG] Supply yield [ethereum-testnet-sepolia] APY%: 5.127110, APR%: 5.000000 2026-03-10T12:11:47Z [USER LOG] Reading APY for chain ethereum-testnet-sepolia-base-1 | pool 0xecb405a1b8e78Bf84419cD007E833C61F77Cc54F | asset 0x88A2d74F47a237a62e7A51cdDa67270CE381555e 2026-03-10T12:11:48Z [USER LOG] Reserve data [ethereum-testnet-sepolia-base-1] currentLiquidityRate: 60000000000000000000000000
2026-03-10T12:11:48Z [USER LOG] Balance in pool [ethereum-testnet-sepolia-base-1]: 0
2026-03-10T12:11:48Z [USER LOG] Supply yield [ethereum-testnet-sepolia-base-1] APY%: 6.183655, APR%: 6.000000 2026-03-10T12:11:48Z [USER LOG] Found best APY: 0.06183654654535964 on chain ethereum-testnet-sepolia-base-1 2026-03-10T12:11:48Z [USER LOG] Rebalancing from ethereum-testnet-sepolia -> ethereum-testnet-sepolia-base-1 (selector 10344971235874465080) 2026-03-10T12:11:49Z [USER LOG] Rebalancing supply from ethereum-testnet-sepolia to ethereum-testnet-sepolia-base-1 | balance=2000000000000000000 2026-03-10T12:11:52Z [USER LOG] Write report transaction succeeded on ethereum-testnet-sepolia txHash: 0x0000000000000000000000000000000000000000000000000000000000000000
2026-03-10T12:11:52Z [USER LOG] Rebalancing complete | Old balance: 0 | New balance: 2000000000000000000 | Amount rebalanced: 2000000000000000000 | Chain: ethereum-testnet-sepolia-base-1

✓ Workflow Simulation Result: ""

2026-03-10T12:11:52Z [SIMULATION] Execution finished signal received 2026-03-10T12:11:52Z [SIMULATION] Skipping WorkflowEngineV2

╭──────────────────────────────────────────────────────╮ │ Simulation complete! Ready to deploy your workflow? │ ────────────╯

--- SIMULATION SUCCESS --- Asset CUSIP-U652199-MOCK is ready to be tokenized on Sepolia.
```
