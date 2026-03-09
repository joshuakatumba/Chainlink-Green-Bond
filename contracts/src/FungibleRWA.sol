// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol"; // For Proof of Reserve

/**
 * @title FungibleRWA
 * @dev ERC-1155 token representing fungible/semi-fungible RWAs (Carbon Credits).
 * Uses Chainlink Proof of Reserve (PoR) to verify off-chain carbon registry balances
 * and Chainlink Automation to automatically sync states.
 */
contract FungibleRWA is ERC1155, AutomationCompatibleInterface {
    
    uint256 public constant CARBON_CREDIT = 1;
    
    // Chainlink Proof of Reserve Feed
    AggregatorV3Interface public reserveFeed;

    uint256 public lastReserveBalance;
    uint256 public totalMinted;

    event ReserveSynced(uint256 newReserveBalance);

    constructor(string memory uri, address _reserveFeed) ERC1155(uri) {
        reserveFeed = AggregatorV3Interface(_reserveFeed);
    }

    /**
     * @dev Fetches verified reserve data from Chainlink PoR
     */
    function getLatestReserve() public view returns (uint256) {
        (, int256 answer, , , ) = reserveFeed.latestRoundData();
        require(answer >= 0, "Invalid reserve data");
        // casting to 'uint256' is safe because answer is verified non-negative above
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint256(answer);
    }

    /**
     * @dev Mint logic respects the Chainlink PoR check
     */
    function mint(address account, uint256 amount) external {
        uint256 currentReserve = getLatestReserve();
        require(totalMinted + amount <= currentReserve, "Not enough off-chain reserves");
        
        totalMinted += amount;
        _mint(account, CARBON_CREDIT, amount, "");
    }

    // --- Chainlink Automation ---

    /**
     * @dev Condition to perform upkeep (sync reserve data)
     */
    function checkUpkeep(bytes calldata /* checkData */) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory performData) 
    {
        uint256 currentReserve = getLatestReserve();
        upkeepNeeded = (currentReserve != lastReserveBalance);
        performData = abi.encode(currentReserve);
    }

    /**
     * @dev Perform upkeep action (sync reserve data)
     */
    function performUpkeep(bytes calldata performData) external override {
        uint256 currentReserve = abi.decode(performData, (uint256));
        require(currentReserve == getLatestReserve(), "Reserve mismatch during upkeep");
        
        lastReserveBalance = currentReserve;
        emit ReserveSynced(currentReserve);
    }
}
