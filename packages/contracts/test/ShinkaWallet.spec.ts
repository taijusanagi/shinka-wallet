/* eslint-disable camelcase */
import { EntryPoint__factory } from "@account-abstraction/contracts";
import { SampleRecipient__factory } from "@account-abstraction/utils/dist/src/types";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

import { INITIAL_DEPOSIT, PAYMASTER_STAKE, UNSTAKE_DELAY_SEC } from "../config";
import { ShinkaWalletPaymasterHandler, ShinkaWalletUserOpHandler } from "../lib/account-abstraction";
import {
  MockChainLinkPriceOracle__factory,
  MockUSDPaymentToken__factory,
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
    const mockUSDPaymentToken = await new MockUSDPaymentToken__factory(signer).deploy();

    const paymaster = await new ShinkaWalletPaymaster__factory(paymasterOwner).deploy(
      entryPoint.address,
      mockChainLinkPriceOracle.address,
      mockUSDPaymentToken.address
    );

    const recipient = await new SampleRecipient__factory(signer).deploy();
    return { provider, signer, walletOwner, paymasterOwner, beneficiary, factory, entryPoint, paymaster, recipient };
  }

  it("should work without paymaster", async () => {
    const { provider, signer, walletOwner, beneficiary, factory, entryPoint, recipient } = await fixture();
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
      target: recipient.address,
      data: recipient.interface.encodeFunctionData("something", ["hello"]),
    });
    await expect(entryPoint.handleOps([preDeployOP], beneficiary))
      .to.emit(recipient, "Sender")
      .withArgs(anyValue, walletAddress, "hello");
    expect(await provider.getCode(walletAddress).then((code) => code.length)).to.greaterThan(1000);
    const postDeployOp = await userOpHandler.createSignedUserOp({
      target: recipient.address,
      data: recipient.interface.encodeFunctionData("something", ["hello"]),
    });
    await expect(entryPoint.handleOps([postDeployOp], beneficiary))
      .to.emit(recipient, "Sender")
      .withArgs(anyValue, walletAddress, "hello");
  });

  it.skip("should work with paymaster", async () => {
    // const { provider, walletOwner, paymasterOwner, beneficiary, recipient, factory, entryPoint, paymaster } =
    //   await fixture();
    // const shinkaWalletPaymasterHandler = new ShinkaWalletPaymasterHandler(paymaster.address);
    // const userOpHandler = new ShinkaWalletUserOpHandler({
    //   signer: walletOwner,
    //   entryPointAddress: entryPoint.address,
    //   factoryAddress: factory.address,
    //   shinkaWalletPaymasterHandler,
    // });
    // await paymaster.connect(paymasterOwner).addStake(0, { value: PAYMASTER_STAKE });
    // await paymaster.connect(paymasterOwner).deposit({ value: ethers.utils.parseEther(INITIAL_DEPOSIT) });
    // const walletAddress = await userOpHandler.getWalletAddress();
    // expect(await provider.getCode(walletAddress).then((code) => code.length)).to.equal(2);
    // const preDeployOp = await userOpHandler.createSignedUserOp({
    //   target: recipient.address,
    //   data: recipient.interface.encodeFunctionData("something", ["hello"]),
    // });
    // await expect(entryPoint.handleOps([preDeployOp], beneficiary))
    //   .to.emit(recipient, "Sender")
    //   .withArgs(anyValue, walletAddress, "hello");
    // expect(await provider.getCode(walletAddress).then((code) => code.length)).to.greaterThan(1000);
    // const postDeployOp = await userOpHandler.createSignedUserOp({
    //   target: recipient.address,
    //   data: recipient.interface.encodeFunctionData("something", ["hello"]),
    // });
    // await expect(entryPoint.handleOps([postDeployOp], beneficiary)).to.revertedWithCustomError(entryPoint, "FailedOp");
    // await paymaster.connect(paymasterOwner).activatePremium(walletOwner.address);
    // await expect(entryPoint.handleOps([postDeployOp], beneficiary))
    //   .to.emit(recipient, "Sender")
    //   .withArgs(anyValue, walletAddress, "hello");
  });
});
