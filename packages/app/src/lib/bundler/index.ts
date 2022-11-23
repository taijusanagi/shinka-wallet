/* eslint-disable camelcase */
import { EntryPoint__factory } from "@account-abstraction/contracts";
import { calcPreVerificationGas } from "@account-abstraction/sdk/dist/src/calcPreVerificationGas";
import { rethrowError } from "@account-abstraction/utils";
import { ethers } from "ethers";

import { getMnemonic } from "../../../../contracts/lib/dev/mnemonic";

export class Bundler {
  provider: ethers.providers.JsonRpcProvider;
  signer: ethers.Signer;
  beneficiary: string;
  constructor(rpc: string) {
    this.provider = new ethers.providers.JsonRpcProvider(rpc);
    const wallet = ethers.Wallet.fromMnemonic(getMnemonic("../../mnemonic.txt"));
    this.signer = wallet.connect(this.provider);
    this.beneficiary = wallet.address;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle = async (method: string, params: any[]): Promise<unknown> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;
    switch (method) {
      case "eth_chainId": {
        console.log("bundler", "eth_chainId");
        const { chainId } = await this.provider.getNetwork();
        result = ethers.utils.hexlify(chainId);
        break;
      }
      case "eth_sendUserOperation": {
        console.log("bundler", "eth_sendUserOperation");
        const [userOp, entryPointAddress] = params;
        const entryPoint = EntryPoint__factory.connect(entryPointAddress, this.signer);
        const requestId = await entryPoint.getRequestId(userOp);
        const expectedPreVerificationGas = calcPreVerificationGas(userOp);

        const preVerificationGas = ethers.BigNumber.from(userOp.preVerificationGas).toNumber();
        if (expectedPreVerificationGas > preVerificationGas) {
          throw new Error(
            `userOp.preVerificationGas too low: expected ${expectedPreVerificationGas} but got ${preVerificationGas}`
          );
        }
        console.log("bundler", "userOp", userOp);
        console.log("bundler", "beneficiary", this.beneficiary);
        const tx = await entryPoint
          .handleOps([userOp], this.beneficiary, { gasLimit: userOp.callGasLimit })
          .catch(rethrowError);
        console.log("bundler", "tx", tx.hash);
        console.log("bundler", "requestId", requestId);
        // this should return request id, but there is no tracker for the requet id now
        // it makes harder to wallet track the tx status, so return tx hash instead
        result = tx.hash;
        break;
      }
      default: {
        throw new Error(`Method ${method} is not supported`);
      }
    }
    return result;
  };
}
