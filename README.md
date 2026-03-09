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

## � Business Model

The Green Bond Protocol is designed to be economically sustainable while providing institutional-grade security. Our revenue model consists of:

1. **AI Verification Fees:** Institutions pay a flat fee (e.g., in ETH or LINK) per document verification request. This fee covers the Chainlink Functions execution costs, the Google Gemini API usage, and includes a small protocol margin.
2. **Tokenization Royalties:** A percentage-based protocol fee is collected by the dedicated `ProtocolTreasury.sol` smart contract upon the successful minting of each verified RWA NFT.
3. **Cross-Chain Premium:** A small margin is added to the base Chainlink CCIP transfer fees when assets are routed across networks, providing ongoing revenue from asset mobility.

All fees are securely collected and managed entirely on-chain.

---

## �📹 Video Walkthrough

*(User: Insert your 3-5 minute YouTube/Vimeo link here showcasing the workflow execution!)*
👉 **[https://youtu.be/65awUP1RYjQ](#)**

---

## 🔗 Chainlink Integrations

This project heavily utilizes Chainlink's suite of services to ensure security, automation, and cross-chain capability. 

Here are the specific files where Chainlink is implemented:

### 1. Chainlink Functions (AI Verification)
Used to reach out to our Next.js/Gemini backend to verify the legal documents before minting.
- 📄 **Smart Contract:** [`contracts/src/UniqueRWA.sol`](./contracts/src/UniqueRWA.sol) - Inherits `FunctionsClient` and uses `FunctionsRequest` to send the payload to the DON.
- 📄 **Off-chain Backend script:** [`backend/updateSource.js`](./backend/updateSource.js) - The JavaScript code that the Chainlink DON executes to call the Gemini API.

### 2. Chainlink CCIP (Cross-Chain Transfers)
Allows the verified RWA NFTs to be bridged securely from the origin chain to destination chains.
- 📄 **Sender Contract:** [`contracts/src/CrossChainRWA.sol`](./contracts/src/CrossChainRWA.sol) - Sends CCIP messages to remote networks.
- 📄 **Receiver Contract:** [`contracts/src/CrossChainReceiver.sol`](./contracts/src/CrossChainReceiver.sol) - Receives and processes the CCIP messages on the destination chain.

### 3. Chainlink Runtime Environment (CRE)
Simulates and automates the RWA verification business logic off-chain before committing to the blockchain.
- 📄 **Workflow Script:** [`workflows/rwa-verification.ts`](./workflows/rwa-verification.ts) - The CRE workflow that integrates the AI verification API and formats the Calldata for the blockchain transaction.
- 📄 **Project Config:** [`project.yaml`](./project.yaml)

---

## 💻 Local Simulation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-public-repo-url>
   cd Chainlink
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *(Ensure you have your `.env` configured with `GEMINI_API_KEY` and contract addresses).*

3. **CRE Simulation:**
   Run the institutional workflow simulation using the CRE CLI:
   ```bash
   cre workflow simulate workflows/rwa-verification.ts
   ```

---

