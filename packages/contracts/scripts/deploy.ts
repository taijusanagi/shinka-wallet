/* eslint-disable camelcase */
import fs from "fs";
import { ethers, network } from "hardhat";
import path from "path";

import { DEV_SIGNER_ADDRESS, PAYMASTER_STAKE, UNSTAKE_DELAY_SEC } from "../config";
import { compareAddressInLowerCase } from "../lib/utils";
import networkJsonFile from "../network.json";
import { EntryPoint__factory, ShinkaWalletDeployer__factory, ShinkaWalletPaymaster__factory } from "../typechain-types";
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

  const EntryPoint = new EntryPoint__factory(signer);
  const entryPoint = await EntryPoint.deploy(PAYMASTER_STAKE, UNSTAKE_DELAY_SEC);
  await entryPoint.deployed();

  const Factory = new ShinkaWalletDeployer__factory(signer);
  const factory = await Factory.deploy();
  await factory.deployed();

  const Paymaster = new ShinkaWalletPaymaster__factory(signer);
  const paymaster = await Paymaster.deploy(entryPoint.address, signerAddress);
  const deployments = {
    entryPoint: entryPoint.address,
    factory: factory.address,
    paymaster: paymaster.address,
  };
  networkJsonFile[chainId].deployments = deployments;
  fs.writeFileSync(path.join(__dirname, `../network.json`), JSON.stringify(networkJsonFile));
  console.log("deployements", deployments);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
