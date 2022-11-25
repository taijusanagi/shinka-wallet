// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ShinkaWalletPaymaster is Ownable, BasePaymaster {
  uint256 public constant COST_OF_POST = 35000;

  // To enable free tx for new user
  uint256 public constant freemiumTxCooldown = 1 days / 4; // should allow update for prod
  mapping(address => uint256) public lastProcessedAt;

  // To enable offchain payment deposit
  AggregatorV3Interface public priceFeedForCreditCardPayment;
  mapping(address => uint256) public balanceWithCreditCardPayment;
  address constant currencyForCreditCard = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

  // To enable pay gas fee with token
  IERC20 public mockUSDCForPaymentToken;

  constructor(
    IEntryPoint anEntryPoint,
    AggregatorV3Interface priceFeedForCreditCardPayment_,
    IERC20 mockUSDCForPaymentToken_
  ) BasePaymaster(anEntryPoint) {
    priceFeedForCreditCardPayment = priceFeedForCreditCardPayment_;
    mockUSDCForPaymentToken = mockUSDCForPaymentToken_;
  }

  // To convert USDC to wei
  function getAmountInETH(uint256 amountInUSD) public view returns (uint256) {
    uint256 decimals = priceFeedForCreditCardPayment.decimals();
    (, int256 answer, , , ) = priceFeedForCreditCardPayment.latestRoundData();
    return (amountInUSD * (10 ** decimals) * 1 ether) / uint256(answer);
  }

  // To convert wei to USDC
  function getAmountInUSD(uint256 amountInETH) public view returns (uint256) {
    return amountInETH;
  }

  // this is helper function for rapid development
  function encodePaymasterAndData(address currency) public view returns (bytes memory) {
    return abi.encode(address(this), currency);
  }

  // this is helper function for rapid development
  function decodePaymasterAndData(bytes memory paymasterAndDeta) public pure returns (address, address) {
    abi.decode(paymasterAndDeta, (address, address));
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

    address account = userOp.sender;
    address signer = Ownable(account).owner();

    bytes calldata paymasterAndData = userOp.paymasterAndData;
    (address paymaster, address currency) = decodePaymasterAndData(paymasterAndData);
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
    return abi.encode(signer);
  }

  function _postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) internal override {
    address signer = abi.decode(context, (address));
    lastProcessedAt[signer] = block.timestamp;
  }
}
