// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./MockUSDForPaymentToken.sol";

contract ShinkaWalletPaymaster is Ownable, BasePaymaster {
  event PaidByCreditCard(address sender, address signer, address currency, uint256 actualGasCost);
  uint256 public constant COST_OF_POST = 35000;

  // To enable offchain payment deposit
  AggregatorV3Interface public priceFeedForCreditCardPayment;
  mapping(address => uint256) public balanceWithCreditCardPayment;
  address constant currencyForCreditCard = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

  // To enable pay gas fee with token
  MockUSDForPaymentToken public mockUSDCForPaymentToken;

  constructor(
    IEntryPoint anEntryPoint,
    AggregatorV3Interface priceFeedForCreditCardPayment_,
    MockUSDForPaymentToken mockUSDCForPaymentToken_
  ) BasePaymaster(anEntryPoint) {
    priceFeedForCreditCardPayment = priceFeedForCreditCardPayment_;
    mockUSDCForPaymentToken = mockUSDCForPaymentToken_;
  }

  // To convert USDC to wei
  // input is formated USDC and output is wei
  function getAmountInETH(uint256 amountInUSD) public view returns (uint256) {
    uint256 priceFeedDecimals = priceFeedForCreditCardPayment.decimals();
    (, int256 answer, , , ) = priceFeedForCreditCardPayment.latestRoundData();
    return (amountInUSD * (10 ** priceFeedDecimals) * 1 ether) / uint256(answer);
  }

  // To convert wei to USDC
  // input is wei and output is unformat USD
  function getAmountInUSD(uint256 amountInETH) public view returns (uint256) {
    uint256 priceFeedDecimals = priceFeedForCreditCardPayment.decimals();
    uint256 tokenDecimals = mockUSDCForPaymentToken.decimals();
    (, int256 answer, , , ) = priceFeedForCreditCardPayment.latestRoundData();
    return ((amountInETH * uint256(answer) * (10 ** tokenDecimals)) / ((10 ** priceFeedDecimals) * 1 ether));
  }

  // this is helper function for rapid development
  function encodePaymasterAndData(address currency) public view returns (bytes memory) {
    return abi.encodePacked(address(this), currency);
  }

  // this is helper function for rapid development
  function decodePaymasterAndData(bytes calldata paymasterAndDeta) public pure returns (address) {
    return address(bytes20(paymasterAndDeta[20:]));
  }

  function processDepositWithCreditCard(address signer, uint256 amountInUSD) external onlyOwner {
    uint256 amountInETH = getAmountInETH(amountInUSD);
    balanceWithCreditCardPayment[signer] = balanceWithCreditCardPayment[signer] + amountInETH;
  }

  function validatePaymasterUserOp(
    UserOperation calldata userOp,
    bytes32 requestId,
    uint256 maxCost
  ) external view override returns (bytes memory context) {
    require(userOp.verificationGasLimit > COST_OF_POST, "ShinkaWalletPaymaster: gas too low for postOp");
    // sender is account abstraction wallet
    address sender = userOp.sender;
    // signer is owner in currenct implementation
    address signer = Ownable(sender).owner();
    bytes calldata paymasterAndData = userOp.paymasterAndData;
    address currency = decodePaymasterAndData(paymasterAndData);
    if (currency == currencyForCreditCard) {
      require(
        // payment is done by signer level
        balanceWithCreditCardPayment[signer] >= maxCost,
        "ShinkaWalletPaymaster: balance with credit card is not enough"
      );
    } else if (currency == address(mockUSDCForPaymentToken)) {
      uint256 amountInUSD = getAmountInUSD(maxCost);
      require(
        // payment is done by contract wallet
        mockUSDCForPaymentToken.balanceOf(userOp.sender) >= amountInUSD,
        "ShinkaWalletPaymaster: balance with USD payment token is not enough"
      );
    } else {
      // TODO: implement 1inch limit order swap for the token
      revert("ShinkaWalletPaymaster: not implemented");
    }
    return abi.encode(sender, signer, currency);
  }

  function _postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) internal override {
    (address sender, address signer, address currency) = abi.decode(context, (address, address, address));
    if (currency == currencyForCreditCard) {
      balanceWithCreditCardPayment[signer] = balanceWithCreditCardPayment[signer] - actualGasCost;
      emit PaidByCreditCard(sender, signer, currency, actualGasCost);
    } else if (currency == address(mockUSDCForPaymentToken)) {
      uint256 amountInUSD = getAmountInUSD(actualGasCost);
      mockUSDCForPaymentToken.transferFrom(sender, address(this), amountInUSD);
    } else {
      // TODO: implement 1inch limit order swap for the token
      revert("ShinkaWalletPaymaster: not implemented");
    }
  }
}
