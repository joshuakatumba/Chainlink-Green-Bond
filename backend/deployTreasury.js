const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../contracts/.env") });

async function main() {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
        console.error("Missing environment variables SEPOLIA_RPC_URL or PRIVATE_KEY in ../contracts/.env");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const abiPath = path.resolve(__dirname, "../contracts/out/ProtocolTreasury.sol/src_ProtocolTreasury_sol_ProtocolTreasury.abi");
    const binPath = path.resolve(__dirname, "../contracts/out/ProtocolTreasury.sol/src_ProtocolTreasury_sol_ProtocolTreasury.bin");

    const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const bytecode = fs.readFileSync(binPath, "utf8").trim();

    console.log("Deploying ProtocolTreasury...");
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy();

    console.log("Deployment transaction hash:", contract.deploymentTransaction().hash);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log("ProtocolTreasury deployed to:", address);
    console.log("Owner:", await contract.owner());
    console.log("Initial Verification Fee:", ethers.formatEther(await contract.verificationFee()), "ETH");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
