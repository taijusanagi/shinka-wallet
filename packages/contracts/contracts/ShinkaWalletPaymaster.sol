// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@account-abstraction/contracts/core/BasePaymaster.sol";

import "hardhat/console.sol";

contract ShinkaWalletPaymaster is Ownable, BasePaymaster {
  constructor(IEntryPoint anEntryPoint) BasePaymaster(anEntryPoint) {}

  // should allow update for prod
  uint256 public constant freemiumTxCooldown = 1 days / 4;

  // should set limit for premium
  mapping(address => uint256) public premiumValidTo;
  uint256 public lastProcessedAt;

  function activatePremium(address account, uint256 period) external onlyOwner {
    premiumValidTo[account] = block.timestamp + period;
  }

  function validatePaymasterUserOp(
    UserOperation calldata userOp,
    bytes32 requestId,
    uint256 maxCost
  ) external view override returns (bytes memory context) {
    address account = userOp.sender;
    address signer = Ownable(account).owner();
    if (premiumValidTo[signer] < block.timestamp) {
      require(
        lastProcessedAt + freemiumTxCooldown < block.timestamp,
        "ShinkaWalletPaymaster: freemium tx cooldown not end"
      );
    }
    return abi.encode(signer);
  }

  function _postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) internal override {
    lastProcessedAt = block.timestamp;
  }
}
