// SPDX-License-Identifier: MIT
pragma solidity ^0.8;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract Token is ERC20, ERC20Burnable {
    constructor(string memory name, string memory symbol, address owner) ERC20(name, symbol) {
        _mint(owner, 100 * 10**uint(decimals()));
    }
}