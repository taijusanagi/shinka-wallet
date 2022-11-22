/* eslint-disable camelcase */

/**
 ** This is copied from
 ** https://github.com/eth-infinitism/bundler
 ** and simplified
 **/

import { SimpleWalletAPI } from "@account-abstraction/sdk";
import { hexConcat } from "ethers/lib/utils";

import {
  ShinkaWallet,
  ShinkaWallet__factory,
  ShinkaWalletDeployer,
  ShinkaWalletDeployer__factory,
} from "../typechain-types";

export class ShinkaWalletAPI extends SimpleWalletAPI {
  walletContract?: ShinkaWallet;
  factory?: ShinkaWalletDeployer;

  async _getWalletContract(): Promise<ShinkaWallet> {
    if (this.walletContract == null) {
      this.walletContract = ShinkaWallet__factory.connect(await this.getWalletAddress(), this.provider);
    }
    return this.walletContract;
  }

  async getCounterFactualAddress(): Promise<string> {
    if (this.factory == null) {
      if (this.factoryAddress != null && this.factoryAddress !== "") {
        this.factory = ShinkaWalletDeployer__factory.connect(this.factoryAddress, this.provider);
      } else {
        throw new Error("no factory to get initCode");
      }
    }
    // TODO: use client calculation for better UX
    return this.factory.getCreate2Address(this.entryPointAddress, await this.owner.getAddress(), this.index);
  }

  async getWalletInitCode(): Promise<string> {
    if (this.factory == null) {
      if (this.factoryAddress != null && this.factoryAddress !== "") {
        this.factory = ShinkaWalletDeployer__factory.connect(this.factoryAddress, this.provider);
      } else {
        throw new Error("no factory to get initCode");
      }
    }
    const ownerAddress = await this.owner.getAddress();
    const data = this.factory.interface.encodeFunctionData("deployWallet", [
      this.entryPointAddress,
      ownerAddress,
      this.index,
    ]);
    return hexConcat([this.factory.address, data]);
  }
}
