// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20Burnable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Bridge {
    address public owner;
    address public validator;
    uint public chainIdDeployed;
    mapping(uint => bool) public chainIdOther; 
    mapping(address => bool) public tokens;
    mapping(bytes32 => bool) public processedTrans;

    enum Type {
        Burn,
        Mint
    }

    struct Transaction {
        address from;
        address to;
        uint chainId;
        address tokenAddr;
        uint256 amount;
        uint256 nonce;
        uint8 v;
        bytes32 r;
        bytes32 s;
        Type transType;
    }
    
    mapping(bytes32 => Transaction) public transactions;

    event Transfer(
        address from,
        address to,
        uint chainId,
        address tokenAddr,
        uint256 amount,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s,
        Type transType
    );

    constructor(address validatorAdd, uint chainIdTo, address tokenAddr) {
        owner = msg.sender;
        validator = validatorAdd;
        chainIdDeployed = block.chainid;
        chainIdOther[chainIdTo] = true;
        tokens[tokenAddr] = true;
    }

    modifier onlyOwner {
        require(msg.sender == owner, 'Not allowed');
        _;
    }

    function addToken(address tokenAddr) public onlyOwner {
        tokens[tokenAddr] = true;
    }

    function addChain(uint chainId) public onlyOwner {
        chainIdOther[chainId] = true;
    }

    function setValidator(address validatorAddr) public onlyOwner {
        validator = validatorAddr;
    }

    function swap(uint chainIdTo, address tokenAddr, address to, uint amount, uint nonce) public {
        require(tokens[tokenAddr], 'Unsupported token');
        IERC20Burnable token = IERC20Burnable(tokenAddr);
        require(chainIdOther[chainIdTo], 'Unsupported chain');
        token.burnFrom(msg.sender, amount);

        bytes32 hashMsg = hashMessage(keccak256(
                abi.encodePacked(msg.sender, to, chainIdTo, tokenAddr, amount, nonce)
            ));
        Transaction memory tr = Transaction(msg.sender, to, chainIdTo, tokenAddr, amount, nonce, 0, 0, 0, Type.Burn);
        transactions[hashMsg] = tr;
        emit Transfer(msg.sender, to, chainIdTo, tokenAddr, amount, nonce, 0, 0, 0, Type.Burn);
    }

    function redeem(
        address addrFrom,
        uint chainIdFrom,
        address tokenAddr,
        uint256 amount,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
        ) public {
        bytes32 hashMsg = hashMessage(keccak256(
                abi.encodePacked(addrFrom, msg.sender, chainIdFrom, tokenAddr, amount, nonce)
            ));
        require(!processedTrans[hashMsg], "Transaction already done");
        require(chainIdOther[chainIdFrom], 'Unsupported chain');
        require(tokens[tokenAddr], 'Unsupported token');
        IERC20Burnable token = IERC20Burnable(tokenAddr);

        address addr1 = ecrecover(hashMsg, v, r, s);
        require(addr1 == validator, "Invalid signer");
        processedTrans[hashMsg] = true;
        token.transferFrom(owner, msg.sender, amount);

        Transaction memory tr = Transaction(addrFrom, msg.sender, chainIdFrom, tokenAddr, amount, nonce, v, r, s, Type.Mint);
        transactions[hashMsg] = tr;
        emit Transfer(addrFrom, msg.sender, chainIdFrom, tokenAddr, amount, nonce, v, r, s, Type.Mint);
    }

   function hashMessage(bytes32 message) private pure returns (bytes32) {
       	bytes memory prefix = "\x19Ethereum Signed Message:\n32";
       	return keccak256(abi.encodePacked(prefix, message));
   }

}
