import { network, run } from "hardhat";

import { PAYMASTER_STAKE, UNSTAKE_DELAY_SEC } from "../config";
import networkJsonFile from "../network.json";
import { isChainId } from "../types/network";

async function main() {
  const chainId = String(network.config.chainId);
  if (!isChainId(chainId)) {
    throw new Error("chainId invalid");
  }
  console.log("network", networkJsonFile[chainId].name);
  for (const [name, address] of Object.entries(networkJsonFile[chainId].deployments)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    if (name === "entryPoint") {
      params.push(PAYMASTER_STAKE);
      params.push(UNSTAKE_DELAY_SEC);
    } else if (name === "paymaster") {
      params.push(
        networkJsonFile[chainId].deployments.entryPoint,
        networkJsonFile[chainId].deployments.priceFeed,
        networkJsonFile[chainId].deployments.paymentToken
      );
    }
    await run("verify:verify", {
      address,
      constructorArguments: params,
    }).catch((e) => console.log(e.message));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
