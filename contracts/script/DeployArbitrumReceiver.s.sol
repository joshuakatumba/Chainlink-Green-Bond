// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CrossChainRWA} from "../src/CrossChainRWA.sol";

/**
 * @title DeployArbitrumReceiver
 * @dev Deploys CrossChainRWA as a receiver on Arbitrum Sepolia.
 *
 * Usage:
 *   forge script script/DeployArbitrumReceiver.s.sol \
 *     --rpc-url $ARBITRUM_SEPOLIA_RPC_URL --broadcast --legacy
 */
contract DeployArbitrumReceiver is Script {

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        // CCIP Router on Arbitrum Sepolia
        address routerAddress = 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165;
        // Default sender: New Sepolia CrossChainRWA address
        address defaultSender = 0xE97448D8d7A28e042cBf462Bc000c31d06556045;

        // The sender contract on Sepolia (CrossChainRWA on source chain)
        address senderContract = vm.envOr("SENDER_CONTRACT", defaultSender);

        console.log("=== Arbitrum Sepolia Receiver Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Authorized sender:", senderContract);

        vm.startBroadcast(deployerKey);

        CrossChainRWA receiver = new CrossChainRWA(routerAddress, senderContract);
        console.log("CrossChainRWA (receiver) deployed at:", address(receiver));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Update frontend/.env with: ===");
        console.log("NEXT_PUBLIC_CROSS_CHAIN_RECEIVER_ADDRESS=", address(receiver));
    }
}
