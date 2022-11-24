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
  mapping(address => bool) public isPremium;
  mapping(address => uint256) public lastProcessedAt;

  function activatePremium(address account) external onlyOwner {
    isPremium[account] = true;
  }

  function isPossibleToPass(address account) public view returns (bool) {
    if (isPremium[account]) {
      return true;
    }
    if (lastProcessedAt[account] + freemiumTxCooldown < block.timestamp) {
      return true;
    }
    return false;
  }

  function validatePaymasterUserOp(
    UserOperation calldata userOp,
    bytes32 requestId,
    uint256 maxCost
  ) external view override returns (bytes memory context) {
    address account = userOp.sender;
    address signer = Ownable(account).owner();
    require(isPossibleToPass(signer), "ShinkaWalletPaymaster: not possible to pass");
    return abi.encode(signer);
  }

  function _postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) internal override {
    address signer = abi.decode(context, (address));
    lastProcessedAt[signer] = block.timestamp;
  }
}
