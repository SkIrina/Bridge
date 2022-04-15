//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Token.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Bridge {
    Token public token;
    address private owner;
    address private validator = 0xAbF78864415e71466DBBB0Bef55ba98F22e468cA;
    mapping(bytes32 => bool) public processedTrans;

    constructor() {
        owner = msg.sender;
        token = new Token("MyERC20", "YEN", owner);
    }

    event SwapInitialized(address from, address to, uint amount, uint nonce);

    function swap(address to, uint amount, uint nonce) public {
        token.burnFrom(msg.sender, amount);
        emit SwapInitialized(msg.sender, to, amount, nonce);
    }

    function redeem(address addr, uint256 amount, uint256 nonce, uint8 v, bytes32 r, bytes32 s) public {
        bytes32 hashMsg = hashMessage(keccak256(
                abi.encodePacked(addr, amount, nonce)
            ));
        require(!processedTrans[hashMsg], "Transaction already done");
        address addr1 = ecrecover(hashMsg, v, r, s);
        require(addr1 == validator, "Invalid signer");
        processedTrans[hashMsg] = true;
        token.transferFrom(owner, addr, amount);
    }

   function hashMessage(bytes32 message) private pure returns (bytes32) {
       	bytes memory prefix = "\x19Ethereum Signed Message:\n32";
       	return keccak256(abi.encodePacked(prefix, message));
   }

}
