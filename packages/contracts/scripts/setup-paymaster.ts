/* eslint-disable camelcase */
import { ethers, network } from "hardhat";

import { DEV_SIGNER_ADDRESS, INITIAL_DEPOSIT, PAYMASTER_STAKE } from "../config";
import { compareAddressInLowerCase } from "../lib/utils";
import networkJsonFile from "../network.json";
import { ShinkaWalletPaymaster__factory } from "../typechain-types";
import { ChainId, isChainId } from "../types/network";

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
  const { paymaster } = networkJsonFile[chainId].deployments;
  const paymasterContract = ShinkaWalletPaymaster__factory.connect(paymaster, signer);
  const addStakeTx = await paymasterContract.addStake(0, { value: PAYMASTER_STAKE });
  console.log("addStakeTx:", addStakeTx.hash);
  await addStakeTx.wait();
  const depositTx = await paymasterContract.deposit({ value: ethers.utils.parseEther(INITIAL_DEPOSIT) });
  console.log("depositTx:", depositTx.hash);
  await depositTx.wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
