// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract POLIToken is ERC20Capped, Ownable {
    constructor(address treasury)
        ERC20("Polyworld Token", "POLI")
        ERC20Capped(980_000_000 * 10 ** decimals())
        Ownable(treasury)
    {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
