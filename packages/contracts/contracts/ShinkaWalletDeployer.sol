// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ShinkaWallet.sol";

import "@openzeppelin/contracts/utils/Create2.sol";

contract ShinkaWalletDeployer {
  function deployWallet(IEntryPoint entryPoint, address owner, uint256 salt) public returns (ShinkaWallet) {
    return new ShinkaWallet{salt: bytes32(salt)}(entryPoint, owner);
  }

  // this is helper function for rapid development
  function getCreate2Address(IEntryPoint entryPoint, address owner, uint256 salt) public view returns (address) {
    bytes memory creationCode = type(ShinkaWallet).creationCode;
    bytes memory initCode = abi.encodePacked(creationCode, abi.encode(entryPoint, owner));
    bytes32 initCodeHash = keccak256(initCode);
    return Create2.computeAddress(bytes32(salt), initCodeHash, address(this));
  }
}
