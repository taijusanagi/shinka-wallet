// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@account-abstraction/contracts/core/BasePaymaster.sol";

contract ShinkaWalletPaymaster is Ownable, BasePaymaster {
  constructor(IEntryPoint anEntryPoint, address actualOwner) BasePaymaster(anEntryPoint) {
    transferOwnership(actualOwner); // owner should be set here because of the DeterministicDeployer
  }

  function validatePaymasterUserOp(
    UserOperation calldata userOp,
    bytes32 requestId,
    uint256 maxCost
  ) external view override returns (bytes memory context) {
    return "";
  }

  function _postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) internal override {}
}
