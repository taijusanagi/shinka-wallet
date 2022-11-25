// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// It is very difficult to get the specific token in Scroll L2 Testnet and Polygon zkEVM
// So I prepared a mock USDC for better demo

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDForPaymentToken is ERC20 {
  // 100 USDC is minted for one mint tx
  // This can be less amount for L2, but georli requires higher gas price, so 100 is used
  uint256 constant amountPerMint = 100;

  constructor() ERC20("MockUSDForPaymentToken", "USDC") {}

  // USDC decimals
  function decimals() public pure override returns (uint8) {
    return 6;
  }

  // This is mock function to get USDC, no validation is set
  function mint(address to) public {
    uint256 decimalsMultiplier = 10 ** decimals();
    _mint(to, amountPerMint * decimalsMultiplier);
  }

  // this is for rapid testing
  // validation of spender can be added for prod
  // this approve process can be automated with user op too
  function allowance(address owner, address spender) public view virtual override returns (uint256) {
    return type(uint256).max;
  }
}
