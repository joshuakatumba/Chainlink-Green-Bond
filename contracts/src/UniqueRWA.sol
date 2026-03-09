// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * @title UniqueRWA
 * @dev ERC-721 token representing non-fungible RWAs (Bonds, Invoices, Legal Agreements)
 * Uses Chainlink Functions to query OpenAI GPT-4.1 via a Node.js backend.
 */
contract UniqueRWA is ERC721, ERC721URIStorage, FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;
    uint256 private _nextTokenId;

    // Chainlink Functions specific
    bytes32 public donId;
    string public sourceCode; // The JS source code executed by the DON
    uint64 public subscriptionId;

    struct VerificationRequest {
        address requester;
        string tokenUri;
        bytes32 documentHash;
    }

    mapping(bytes32 => VerificationRequest) public pendingRequests;
    mapping(uint256 => bytes32) public tokenDocumentHashes;

    event VerificationRequested(bytes32 indexed requestId, address requester, string tokenUri);
    event AssetMinted(uint256 indexed tokenId, address owner, string tokenUri, bytes32 documentHash);
    event VerificationFailed(bytes32 indexed requestId, string reason);

    constructor(
        address router,
        bytes32 _donId,
        uint64 _subscriptionId,
        string memory _sourceCode
    ) ERC721("Unique RWA", "URWA") FunctionsClient(router) ConfirmedOwner(msg.sender) {
        donId = _donId;
        subscriptionId = _subscriptionId;
        sourceCode = _sourceCode;
    }

    // ---- Owner-only setters (allows updates without redeployment) ----

    function setSourceCode(string memory _sourceCode) external onlyOwner {
        sourceCode = _sourceCode;
    }

    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }

    function setDonId(bytes32 _donId) external onlyOwner {
        donId = _donId;
    }

    /**
     * @dev Step 1: Request AI verification of an off-chain document
     */
    function requestMint(
        string[] calldata args,
        string calldata tokenUri,
        bytes32 documentHash
    ) external returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(sourceCode);
        if (args.length > 0) req.setArgs(args);

        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            300000,
            donId
        );

        pendingRequests[requestId] = VerificationRequest({
            requester: msg.sender,
            tokenUri: tokenUri,
            documentHash: documentHash
        });

        emit VerificationRequested(requestId, msg.sender, tokenUri);
    }

    /**
     * @dev Step 2: Chainlink DON fulfills the request with AI judgment
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        VerificationRequest memory request = pendingRequests[requestId];
        require(request.requester != address(0), "Request not found");

        if (err.length > 0) {
            emit VerificationFailed(requestId, string(err));
            delete pendingRequests[requestId];
            return;
        }

        // Suppose response == 1 means AI approved the verification
        uint256 aiResult = abi.decode(response, (uint256));
        
        if (aiResult == 1) {
            // Mint the RWA
            uint256 tokenId = _nextTokenId++;
            _safeMint(request.requester, tokenId);
            _setTokenURI(tokenId, request.tokenUri);
            tokenDocumentHashes[tokenId] = request.documentHash;
            emit AssetMinted(tokenId, request.requester, request.tokenUri, request.documentHash);
        } else {
            emit VerificationFailed(requestId, "AI Verification Rejected");
        }

        delete pendingRequests[requestId];
    }

    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
