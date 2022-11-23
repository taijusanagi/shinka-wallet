/* eslint-disable camelcase */
import { SampleRecipient__factory } from "@account-abstraction/utils/dist/src/types";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

import { DeterministicDeployer } from "../lib/infinitism/DeterministicDeployer";
import { ShinkaWalletAPI } from "../lib/ShinkaWalletAPI";
import { EntryPoint__factory, ShinkaWalletDeployer__factory } from "../typechain-types";

describe("ShinkaWallet", function () {
  async function fixture() {
    const provider = ethers.provider;
    const [signer, walletOwner, paymasterOwner] = await ethers.getSigners();
    const beneficiary = await signer.getAddress();
    console.log(beneficiary);
    const entryPoint = await new EntryPoint__factory(signer).deploy(1, 1);
    const recipient = await new SampleRecipient__factory(signer).deploy();
    const factoryAddress = await DeterministicDeployer.deploy(ShinkaWalletDeployer__factory.bytecode);
    return { provider, signer, walletOwner, paymasterOwner, beneficiary, recipient, factoryAddress, entryPoint };
  }

  it("should work", async () => {
    const { provider, signer, walletOwner, beneficiary, recipient, factoryAddress, entryPoint } = await fixture();
    const api = new ShinkaWalletAPI({
      provider,
      entryPointAddress: entryPoint.address,
      owner: walletOwner,
      factoryAddress,
    });
    const walletAddress = await api.getWalletAddress();
    expect(await provider.getCode(walletAddress).then((code) => code.length)).to.equal(2);
    await signer.sendTransaction({
      to: walletAddress,
      value: ethers.utils.parseEther("0.1"),
    });
    const op = await api.createSignedUserOp({
      target: recipient.address,
      data: recipient.interface.encodeFunctionData("something", ["hello"]),
    });
    await expect(entryPoint.handleOps([op], beneficiary))
      .to.emit(recipient, "Sender")
      .withArgs(anyValue, walletAddress, "hello");
    expect(await provider.getCode(walletAddress).then((code) => code.length)).to.greaterThan(1000);
  });
});
