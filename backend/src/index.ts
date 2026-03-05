import express from "express";
import dotenv from "dotenv";
import { ethers } from "ethers";
import OpenAI from "openai";
import { create as createIpfsClient } from "ipfs-http-client"; // Mocking web3.storage integration
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(express.json());

// 1. Initialize OpenAI GPT-4.1 (using "gpt-4-turbo-preview" as fallback for newest model if 4.1 isn't standard in SDK)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 2. Setup Ethers wallet for EIP-712 signing
const privateKey = process.env.SIGNER_PRIVATE_KEY || "0x0123456789012345678901234567890123456789012345678901234567890123";
const wallet = new ethers.Wallet(privateKey);

/**
 * Route: Verify RWA Document
 * Description: Takes off-chain data, verifies it with AI, stores on IPFS, and signs the approval.
 */
app.post("/api/verify-rwa", async (req, res) => {
    try {
        const { documentText, assetType, assetId } = req.body;

        // Step 1: AI Verification Logic
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview", // Acting as GPT-4.1
            messages: [
                {
                    role: "system",
                    content: "You are an institutional RWA verification AI. Verify this document's legitimacy for tokenization. Return a JSON with 'verified' (boolean) and 'confidence' (0-1)."
                },
                {
                    role: "user",
                    content: `Asset Type: ${assetType}\nAsset ID: ${assetId}\nDocument: ${documentText}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const aiResponse = JSON.parse(completion.choices[0].message.content || "{}");
        if (!aiResponse.verified) {
            return res.status(400).json({ error: "AI Verification Failed", data: aiResponse });
        }

        // Step 2: SHA-256 Hashing of Document
        const documentHash = crypto.createHash("sha256").update(documentText).digest("hex");

        // Step 3: IPFS Storage via web3.storage / IPFS Client
        // In reality, web3.storage client or ipfs-http-client is used. 
        // Here we mock the CID return for demonstration readiness.
        const mockCid = "bafybeicg2uoyrtxb5uclc4v6wz7i5bylxbs5lxt7k33h2b2s7z5t62pif4";
        const documentUri = `ipfs://${mockCid}`;

        // Step 4: EIP-712 Typed Data Signing
        const domain = {
            name: "RWA_Verification",
            version: "1",
            chainId: 11155111, // Sepolia
            verifyingContract: process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"
        };

        const types = {
            Verification: [
                { name: "assetId", type: "string" },
                { name: "documentHash", type: "string" },
                { name: "documentUri", type: "string" },
                { name: "verified", type: "bool" }
            ]
        };

        const value = {
            assetId: assetId,
            documentHash: documentHash,
            documentUri: documentUri,
            verified: true
        };

        const signature = await wallet.signTypedData(domain, types, value);

        res.json({
            success: true,
            assetId,
            documentHash: `0x${documentHash}`,
            documentUri,
            signature,
            aiConfidence: aiResponse.confidence
        });

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`RWA Backend running on port ${PORT}`);
});
