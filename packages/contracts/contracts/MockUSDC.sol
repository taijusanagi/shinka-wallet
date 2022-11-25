// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// It is very difficult to get the specific token in Scroll L2 Testnet and Polygon zkEVM
// So I prepared a mock USDC for better demo

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
  // 10 USDC is minted for one mint tx
  uint256 constant amountPerMint = 10;

  constructor() ERC20("MockUSDC", "MUSDC") {}

  // USDC decimals
  function decimals() public pure override returns (uint8) {
    return 6;
  }

  // This is mock function to get USDC, no validation is set
  function mint(address to) public {
    _mint(to, amountPerMint * 10 ** decimals());
  }
}
