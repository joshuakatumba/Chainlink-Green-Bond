const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = "0x9737acf063cb5b10b56a72755f66dcd05c758786";
    const sourceCode = process.env.FUNCTIONS_SOURCE;

    if (!rpcUrl || !privateKey || !sourceCode) {
        console.error("Missing environment variables in .env");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const abi = [
        "function setSourceCode(string memory _sourceCode) external",
        "function sourceCode() external view returns (string)"
    ];

    const contract = new ethers.Contract(contractAddress, abi, wallet);

    console.log("Setting source code for contract:", contractAddress);
    const tx = await contract.setSourceCode(sourceCode);
    console.log("Transaction hash:", tx.hash);

    console.log("Waiting for confirmation...");
    await tx.wait();
    console.log("Source code updated successfully!");

    const updatedSource = await contract.sourceCode();
    if (updatedSource === sourceCode) {
        console.log("Verification successful: Source code on-chain matches .env");
    } else {
        console.error("Verification failed: Source code on-chain does not match!");
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
