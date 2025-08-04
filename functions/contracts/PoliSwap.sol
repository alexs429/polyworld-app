// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract PoliSwap {
    address public owner;
    IERC20 public usdt;
    IERC20 public poli;
    address public treasury;

    // Rate: how many 18-dec POLI per 1 USDT (6-dec)
    uint256 public rate = 5 * 1e18; // 5 POLI per 1 USDT

    event PoliPurchased(address indexed buyer, uint256 usdtSpent, uint256 poliReceived);
    event RateUpdated(uint256 newRate);

    constructor(address _usdt, address _poli, address _treasury) {
        owner = msg.sender;
        usdt = IERC20(_usdt);
        poli = IERC20(_poli);
        treasury = _treasury;
    }

    function buyPoli(uint256 usdtAmount) external {
        require(usdtAmount > 0, "Amount must be > 0");
        require(usdt.allowance(msg.sender, address(this)) >= usdtAmount, "USDT not approved");
        require(usdt.transferFrom(msg.sender, treasury, usdtAmount), "USDT transfer failed");

        uint256 poliAmount = (usdtAmount * rate) / 1e6; // normalize USDT(6) to POLI(18)
        require(poli.transferFrom(treasury, msg.sender, poliAmount), "POLI transfer failed");

        emit PoliPurchased(msg.sender, usdtAmount, poliAmount);
    }

    function updateRate(uint256 newRate) external {
        require(msg.sender == owner, "Not owner");
        rate = newRate;
        emit RateUpdated(newRate);
    }

    function getExpectedPoli(uint256 usdtAmount) external view returns (uint256) {
        return (usdtAmount * rate) / 1e6;
    }
}
