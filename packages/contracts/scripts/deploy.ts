/* eslint-disable camelcase */
import fs from "fs";
import { ethers, network } from "hardhat";
import path from "path";

import { DEV_SIGNER_ADDRESS } from "../config";
import { DeterministicDeployer } from "../lib/infinitism/DeterministicDeployer";
import { compareAddressInLowerCase } from "../lib/utils";
import { EntryPoint__factory, ShinkaWalletDeployer__factory, UncheckedPaymaster__factory } from "../typechain-types";
import { ChainId, isChainId } from "../types/ChainId";

async function main() {
  const chainId = String(network.config.chainId) as ChainId;
  console.log("chainId", chainId);
  if (!isChainId(chainId)) {
    throw new Error("chain id invalid");
  }
  const signer = await ethers.provider.getSigner();
  const signerAddress = await signer.getAddress();
  console.log("signer", signerAddress);
  if (!compareAddressInLowerCase(signerAddress, DEV_SIGNER_ADDRESS)) {
    throw new Error("signer invalid");
  }
  const argument = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256"], [1, 1]);
  const entryPointCreationCode = ethers.utils.solidityPack(
    ["bytes", "bytes"],
    [EntryPoint__factory.bytecode, argument]
  );
  const entryPointAddress = await DeterministicDeployer.deploy(entryPointCreationCode);
  const factoryAddress = await DeterministicDeployer.deploy(ShinkaWalletDeployer__factory.bytecode);
  const deployPaymasterArgument = ethers.utils.defaultAbiCoder.encode(
    ["address", "address"],
    // this address data is dummy for local testing
    [entryPointAddress, signerAddress]
  );
  const paymasterCreationCode = ethers.utils.solidityPack(
    ["bytes", "bytes"],
    [UncheckedPaymaster__factory.bytecode, deployPaymasterArgument]
  );
  const paymasterAddress = await DeterministicDeployer.deploy(paymasterCreationCode);
  const result = {
    entryPoint: entryPointAddress,
    factory: factoryAddress,
    paymaster: paymasterAddress,
  };
  fs.writeFileSync(path.join(__dirname, `../deployments.json`), JSON.stringify(result));
  console.log("deployement done", result);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
