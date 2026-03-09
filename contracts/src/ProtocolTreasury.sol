// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ProtocolTreasury
 * @dev A simple contract to collect fees for RWA verification.
 */
contract ProtocolTreasury {
    address public owner;
    uint256 public verificationFee = 0.001 ether; // Set to a low value for testing

    event FeePaid(address indexed payer, string assetId, uint256 amount);
    event FeeUpdated(uint256 oldFee, uint256 newFee);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Users call this to pay for their asset verification.
     * @param assetId The unique identifier of the asset being verified.
     */
    function payVerificationFee(string memory assetId) external payable {
        require(msg.value >= verificationFee, "Insufficient verification fee");
        emit FeePaid(msg.sender, assetId, msg.value);
    }

    function setVerificationFee(uint256 _newFee) external onlyOwner {
        emit FeeUpdated(verificationFee, _newFee);
        verificationFee = _newFee;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
