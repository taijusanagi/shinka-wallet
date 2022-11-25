/* eslint-disable camelcase */
import { EntryPoint__factory } from "@account-abstraction/contracts";
import { SampleRecipient__factory } from "@account-abstraction/utils/dist/src/types";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

import { ADDRESS_FOR_CREDIT_CARD, INITIAL_DEPOSIT, PAYMASTER_STAKE, UNSTAKE_DELAY_SEC } from "../config";
import { ShinkaWalletUserOpHandler } from "../lib/account-abstraction";
import {
  MockChainLinkPriceOracle__factory,
  MockUSDForPaymentToken__factory,
  ShinkaWalletDeployer__factory,
  ShinkaWalletPaymaster__factory,
} from "../typechain-types";

describe("ShinkaWallet", function () {
  async function fixture() {
    const provider = ethers.provider;
    const [signer, walletOwner, paymasterOwner] = await ethers.getSigners();
    const beneficiary = await signer.getAddress();
    const entryPoint = await new EntryPoint__factory(signer).deploy(PAYMASTER_STAKE, UNSTAKE_DELAY_SEC);
    const factory = await new ShinkaWalletDeployer__factory(signer).deploy();

    const mockChainLinkPriceOracle = await new MockChainLinkPriceOracle__factory(signer).deploy();
    const mockUSDForPaymentToken = await new MockUSDForPaymentToken__factory(signer).deploy();

    const paymaster = await new ShinkaWalletPaymaster__factory(paymasterOwner).deploy(
      entryPoint.address,
      mockChainLinkPriceOracle.address,
      mockUSDForPaymentToken.address
    );

    // this is mock contract for testing
    const sampleRecipient = await new SampleRecipient__factory(signer).deploy();

    return {
      provider,
      signer,
      walletOwner,
      paymasterOwner,
      beneficiary,
      factory,
      entryPoint,
      paymaster,
      mockChainLinkPriceOracle,
      mockUSDForPaymentToken,
      sampleRecipient,
    };
  }

  it("should work without paymaster", async () => {
    const { provider, signer, walletOwner, beneficiary, factory, entryPoint, sampleRecipient } = await fixture();
    const userOpHandler = new ShinkaWalletUserOpHandler({
      signer: walletOwner,
      entryPointAddress: entryPoint.address,
      factoryAddress: factory.address,
    });
    const walletAddress = await userOpHandler.getWalletAddress();
    expect(await provider.getCode(walletAddress).then((code) => code.length)).to.equal(2);
    await signer.sendTransaction({
      to: walletAddress,
      value: ethers.utils.parseEther("0.1"),
    });
    const preDeployOP = await userOpHandler.createSignedUserOp({
      target: sampleRecipient.address,
      data: sampleRecipient.interface.encodeFunctionData("something", ["hello"]),
    });
    await expect(entryPoint.handleOps([preDeployOP], beneficiary))
      .to.emit(sampleRecipient, "Sender")
      .withArgs(anyValue, walletAddress, "hello");
    expect(await provider.getCode(walletAddress).then((code) => code.length)).to.greaterThan(1000);

    // this is tested to make sure tx passed when sender is already deployed
    const postDeployOp = await userOpHandler.createSignedUserOp({
      target: sampleRecipient.address,
      data: sampleRecipient.interface.encodeFunctionData("something", ["hello"]),
    });
    await expect(entryPoint.handleOps([postDeployOp], beneficiary))
      .to.emit(sampleRecipient, "Sender")
      .withArgs(anyValue, walletAddress, "hello");
  });

  it("price calculation with chainlink", async () => {
    const { paymaster } = await fixture();
    const amountInUSDWithFormat = 100;
    const amountInETH = await paymaster.getAmountInETH(amountInUSDWithFormat);
    const amountInEthWithFormat = ethers.utils.formatEther(amountInETH);
    // this is helper log for rapid development
    console.log(`${amountInUSDWithFormat} USD is equivalent to ${amountInEthWithFormat} ETH in mock price feed`);
    // check amount with recoverting it
    const amountInUSD = await paymaster.getAmountInUSD(amountInETH);
    console.log(`${amountInEthWithFormat} ETH is equivalent to  ${ethers.utils.formatUnits(amountInUSD, 6)} USD`);
  });

  it("should work with paymaster and credit card payment", async () => {
    const { walletOwner, paymasterOwner, beneficiary, factory, entryPoint, paymaster, sampleRecipient } =
      await fixture();
    const userOpHandler = new ShinkaWalletUserOpHandler({
      signer: walletOwner,
      entryPointAddress: entryPoint.address,
      factoryAddress: factory.address,
    });
    await paymaster.connect(paymasterOwner).addStake(0, { value: PAYMASTER_STAKE });
    await paymaster.connect(paymasterOwner).deposit({ value: ethers.utils.parseEther(INITIAL_DEPOSIT) });
    const walletAddress = await userOpHandler.getWalletAddress();
    const paymasterAndDataWithCreditCardPayment = await paymaster.encodePaymasterAndData(ADDRESS_FOR_CREDIT_CARD);
    await paymaster.connect(paymasterOwner).processDepositWithCreditCard(walletOwner.address, 100);
    const opWithCreditCardPayment = await userOpHandler.createSignedUserOp({
      target: sampleRecipient.address,
      data: sampleRecipient.interface.encodeFunctionData("something", ["hello"]),
      paymasterAndData: paymasterAndDataWithCreditCardPayment,
    });
    await expect(entryPoint.handleOps([opWithCreditCardPayment], beneficiary))
      .to.emit(sampleRecipient, "Sender")
      .withArgs(anyValue, walletAddress, "hello");
  });

  it("should work with paymaster and payment token", async () => {
    const {
      walletOwner,
      paymasterOwner,
      beneficiary,
      factory,
      entryPoint,
      paymaster,
      mockUSDForPaymentToken,
      sampleRecipient,
    } = await fixture();
    const userOpHandler = new ShinkaWalletUserOpHandler({
      signer: walletOwner,
      entryPointAddress: entryPoint.address,
      factoryAddress: factory.address,
    });
    await paymaster.connect(paymasterOwner).addStake(0, { value: PAYMASTER_STAKE });
    await paymaster.connect(paymasterOwner).deposit({ value: ethers.utils.parseEther(INITIAL_DEPOSIT) });
    const walletAddress = await userOpHandler.getWalletAddress();
    const paymasterAndDataWithPaymentToken = await paymaster.encodePaymasterAndData(mockUSDForPaymentToken.address);
    await mockUSDForPaymentToken.mint(walletAddress);
    const opWithPaymentToken = await userOpHandler.createSignedUserOp({
      target: sampleRecipient.address,
      data: sampleRecipient.interface.encodeFunctionData("something", ["hello"]),
      paymasterAndData: paymasterAndDataWithPaymentToken,
    });
    await expect(entryPoint.handleOps([opWithPaymentToken], beneficiary))
      .to.emit(sampleRecipient, "Sender")
      .withArgs(anyValue, walletAddress, "hello");
  });
});
