// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {FungibleRWA} from "../src/FungibleRWA.sol";
import {UniqueRWA} from "../src/UniqueRWA.sol";
import {CrossChainRWA} from "../src/CrossChainRWA.sol";

/**
 * @title DeployAll
 * @dev Deploys all three RWA contracts to the target network.
 *
 * Required environment variables:
 *   PRIVATE_KEY              - Deployer wallet private key
 *
 * Optional overrides (defaults to Sepolia values):
 *   CCIP_ROUTER              - CCIP Router address
 *   RESERVE_FEED             - Chainlink PoR feed address
 *   FUNCTIONS_ROUTER         - Chainlink Functions router address
 *   FUNCTIONS_DON_ID         - DON ID for Chainlink Functions
 *   FUNCTIONS_SUB_ID         - Chainlink Functions subscription ID
 *   METADATA_URI             - ERC-1155 metadata URI
 *
 * Usage:
 *   forge script script/DeployAll.s.sol --rpc-url sepolia --broadcast --verify
 */
contract DeployAll is Script {
    // ---- Sepolia defaults ----
    // CCIP Router on Sepolia
    address constant SEPOLIA_CCIP_ROUTER = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    // Chainlink Functions Router on Sepolia
    address constant SEPOLIA_FUNCTIONS_ROUTER = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;
    // DON ID for Sepolia Functions
    bytes32 constant SEPOLIA_DON_ID = 0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000; // fun-ethereum-sepolia-1
    // Placeholder PoR feed (replace with actual feed address)
    address constant SEPOLIA_RESERVE_FEED = address(0);

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        // --- Read config with defaults ---
        address ccipRouter = vm.envOr("CCIP_ROUTER", SEPOLIA_CCIP_ROUTER);
        address reserveFeed = vm.envOr("RESERVE_FEED", SEPOLIA_RESERVE_FEED);
        address functionsRouter = vm.envOr("FUNCTIONS_ROUTER", SEPOLIA_FUNCTIONS_ROUTER);
        bytes32 donId = vm.envOr("FUNCTIONS_DON_ID", SEPOLIA_DON_ID);
        uint64 subId = uint64(vm.envOr("FUNCTIONS_SUB_ID", uint256(0)));
        string memory metadataUri = vm.envOr("METADATA_URI", string("https://example.com/metadata/{id}.json"));
        string memory sourceCode = vm.envOr("FUNCTIONS_SOURCE", string(""));

        console.log("=== RWA Contract Deployment ===");
        console.log("Deployer:", deployer);
        console.log("");

        vm.startBroadcast(deployerKey);

        // 1. Deploy FungibleRWA (ERC-1155 + Automation + PoR)
        FungibleRWA fungible = new FungibleRWA(metadataUri, reserveFeed);
        console.log("FungibleRWA deployed at:", address(fungible));

        // 2. Deploy UniqueRWA (ERC-721 + Functions)
        UniqueRWA unique = new UniqueRWA(functionsRouter, donId, subId, sourceCode);
        console.log("UniqueRWA  deployed at:", address(unique));

        // 3. Deploy CrossChainRWA (CCIP) — uses deployer as initial sender
        CrossChainRWA crossChain = new CrossChainRWA(ccipRouter, deployer);
        console.log("CrossChainRWA deployed at:", address(crossChain));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Complete ===");
    }
}
