/* eslint-disable camelcase */
import { SampleRecipient__factory } from "@account-abstraction/utils/dist/src/types";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

import { INITIAL_DEPOSIT, PAYMASTER_STAKE, UNSTAKE_DELAY_SEC } from "../config";
import { ShinkaWalletPaymasterHandler, ShinkaWalletUserOpHandler } from "../lib/account-abstraction";
import { DeterministicDeployer } from "../lib/infinitism/DeterministicDeployer";
import { ShinkaWalletAPI } from "../lib/ShinkaWalletAPI";
import { UncheckedPaymasterAPI } from "../lib/UncheckedPaymasterAPI";
import { EntryPoint__factory, ShinkaWalletDeployer__factory, UncheckedPaymaster__factory } from "../typechain-types";

describe("ShinkaWallet", function () {
  async function fixture() {
    const provider = ethers.provider;
    const [signer, walletOwner, paymasterOwner] = await ethers.getSigners();
    const beneficiary = await signer.getAddress();
    const entryPoint = await new EntryPoint__factory(signer).deploy(PAYMASTER_STAKE, UNSTAKE_DELAY_SEC);
    const recipient = await new SampleRecipient__factory(signer).deploy();
    const factoryAddress = await DeterministicDeployer.deploy(ShinkaWalletDeployer__factory.bytecode);
    return { provider, signer, walletOwner, paymasterOwner, beneficiary, recipient, factoryAddress, entryPoint };
  }

  it("should work without paymaster", async () => {
    const { provider, signer, walletOwner, beneficiary, recipient, factoryAddress, entryPoint } = await fixture();
    const api = new ShinkaWalletAPI({
      provider,
      entryPointAddress: entryPoint.address,
      owner: walletOwner,
      factoryAddress,
    });

    const userOpHandler = new ShinkaWalletUserOpHandler({
      signer: walletOwner,
      entryPointAddress: entryPoint.address,
      factoryAddress,
    });

    const walletAddress = await api.getWalletAddress();

    console.log("walletAddress", walletAddress);
    expect(await provider.getCode(walletAddress).then((code) => code.length)).to.equal(2);
    await signer.sendTransaction({
      to: walletAddress,
      value: ethers.utils.parseEther("0.1"),
    });

    const op = await api.createSignedUserOp({
      target: recipient.address,
      data: recipient.interface.encodeFunctionData("something", ["hello"]),
    });
    const op2 = await userOpHandler.createSignedUserOp({
      target: recipient.address,
      data: recipient.interface.encodeFunctionData("something", ["hello"]),
    });

    //   struct UserOperation {

    //     address sender;
    //     uint256 nonce;
    //     bytes initCode;
    //     bytes callData;
    //     uint256 callGasLimit;
    //     uint256 verificationGasLimit;
    //     uint256 preVerificationGas;
    //     uint256 maxFeePerGas;
    //     uint256 maxPriorityFeePerGas;
    //     bytes paymasterAndData;
    //     bytes signature;
    // }

    // console.log("op", op);
    // console.log("op2", op2);
    // 0xffb5b6af0000000000000000000000005e1417c303048c7ff12e678574e3b48b3b941ad1000000000000000000000000e68fbecbe7fe5479c15ad368cb8cdf32eec5d3860000000000000000000000000000000000000000000000000000000000000000
    // 0x25167ae603b7928ec103b3bf54f78bb7101b33c6ffb5b6af0000000000000000000000005e1417c303048c7ff12e678574e3b48b3b941ad1000000000000000000000000e68fbecbe7fe5479c15ad368cb8cdf32eec5d3860000000000000000000000000000000000000000000000000000000000000000

    console.log("valid op", op);
    console.log("invalid op", op2);

    const validRequestId = await api.getRequestId(op);
    console.log("validRequestId", validRequestId);

    const invalidRequestId = await userOpHandler.getRequestId(op2);
    console.log("invalidRequestId", invalidRequestId);

    await expect(entryPoint.handleOps([op2], beneficiary))
      .to.emit(recipient, "Sender")
      .withArgs(anyValue, walletAddress, "hello");
    expect(await provider.getCode(walletAddress).then((code) => code.length)).to.greaterThan(1000);
  });
  it("should work with paymaster", async () => {
    const { provider, walletOwner, paymasterOwner, beneficiary, recipient, factoryAddress, entryPoint } =
      await fixture();
    const deployPaymasterArgument = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [entryPoint.address, paymasterOwner.address]
    );
    const paymasterCreationCode = ethers.utils.solidityPack(
      ["bytes", "bytes"],
      [UncheckedPaymaster__factory.bytecode, deployPaymasterArgument]
    );
    const paymasterAddress = await DeterministicDeployer.deploy(paymasterCreationCode);
    const paymasterAPI = new UncheckedPaymasterAPI(paymasterAddress);
    const api = new ShinkaWalletAPI({
      provider,
      entryPointAddress: entryPoint.address,
      owner: walletOwner,
      factoryAddress,
      paymasterAPI,
    });

    const shinkaWalletPaymasterHandler = new ShinkaWalletPaymasterHandler({ paymasterAddress });
    const userOpHandler = new ShinkaWalletUserOpHandler({
      signer: walletOwner,
      entryPointAddress: entryPoint.address,
      factoryAddress,
      shinkaWalletPaymasterHandler,
    });

    const paymasterContract = UncheckedPaymaster__factory.connect(paymasterAddress, paymasterOwner);
    await paymasterContract.addStake(0, { value: PAYMASTER_STAKE });
    await paymasterContract.deposit({ value: ethers.utils.parseEther(INITIAL_DEPOSIT) });
    const walletAddress = await api.getWalletAddress();
    expect(await provider.getCode(walletAddress).then((code) => code.length)).to.equal(2);
    const op = await userOpHandler.createSignedUserOp({
      target: recipient.address,
      data: recipient.interface.encodeFunctionData("something", ["hello"]),
    });
    await expect(entryPoint.handleOps([op], beneficiary))
      .to.emit(recipient, "Sender")
      .withArgs(anyValue, walletAddress, "hello");
    expect(await provider.getCode(walletAddress).then((code) => code.length)).to.greaterThan(1000);
  });
});
