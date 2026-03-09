// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";

/**
 * @title CrossChainRWA
 * @dev Handles moving RWA records/tokens cross-chain using CCIP
 */
contract CrossChainRWA is CCIPReceiver {
    address public immutable SENDER_CONTRACT;
    
    event MessageSent(bytes32 indexed messageId, uint64 indexed destinationChainSelector);
    event MessageReceived(bytes32 indexed messageId, uint64 indexed sourceChainSelector, address sender, string text);

    constructor(address _router, address _senderContract) CCIPReceiver(_router) {
        SENDER_CONTRACT = _senderContract;
    }

    /**
     * @dev Sends a message across chains via CCIP
     */
    function sendCrossChainVerification(
        uint64 destinationChainSelector,
        address receiver,
        string memory verificationData
    ) external payable returns (bytes32 messageId) {
        
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCcipMessage(
            receiver,
            verificationData,
            address(0) // Fee token is native ETH
        );

        IRouterClient router = IRouterClient(this.getRouter());
        
        uint256 fees = router.getFee(destinationChainSelector, evm2AnyMessage);
        require(msg.value >= fees, "Not enough ETH sent for CCIP fee");

        messageId = router.ccipSend{value: fees}(
            destinationChainSelector,
            evm2AnyMessage
        );

        // Refund excess ETH
        if (msg.value > fees) {
            (bool success, ) = msg.sender.call{value: msg.value - fees}("");
            require(success, "ETH refund failed");
        }

        emit MessageSent(messageId, destinationChainSelector);
        return messageId;
    }

    function _ccipReceive(
        Client.Any2EVMMessage memory any2EvmMessage
    ) internal override {
        require(abi.decode(any2EvmMessage.sender, (address)) == SENDER_CONTRACT, "Unauthorized CCIP sender");
        
        string memory receivedData = abi.decode(any2EvmMessage.data, (string));
        
        emit MessageReceived(
            any2EvmMessage.messageId,
            any2EvmMessage.sourceChainSelector,
            abi.decode(any2EvmMessage.sender, (address)),
            receivedData
        );
    }

    function _buildCcipMessage(
        address _receiver,
        string memory _text,
        address _feeTokenAddress
    ) internal pure returns (Client.EVM2AnyMessage memory) {
        return
            Client.EVM2AnyMessage({
                receiver: abi.encode(_receiver),
                data: abi.encode(_text),
                tokenAmounts: new Client.EVMTokenAmount[](0),
                extraArgs: Client._argsToBytes(
                    Client.EVMExtraArgsV1({gasLimit: 200_000})
                ),
                feeToken: _feeTokenAddress
            });
    }

    receive() external payable {}
}
