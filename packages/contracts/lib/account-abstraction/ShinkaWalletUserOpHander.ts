/* eslint-disable camelcase */
import { EntryPoint, EntryPoint__factory, UserOperationStruct } from "@account-abstraction/contracts";
import { TransactionDetailsForUserOp } from "@account-abstraction/sdk/dist/src/TransactionDetailsForUserOp";
import { getRequestId } from "@account-abstraction/utils";
import { ethers } from "ethers";

import { GAS_AMOUNT_FOR_DEPLOY, GAS_AMOUNT_FOR_VERIFICATION } from "../../config";
import {
  ShinkaWallet,
  ShinkaWallet__factory,
  ShinkaWalletDeployer,
  ShinkaWalletDeployer__factory,
} from "../../typechain-types";
import { ChainId, isChainId } from "../../types/network";
import { calcPreVerificationGas, GasOverheads } from "./lib/calcPreVerificationGas";

export interface TransactionDetailsForUserOpWithPaymasterAndData extends TransactionDetailsForUserOp {
  paymasterAndData?: string;
  passInitCode?: boolean;
}

export interface ShinkaWalletUserOpHandlerParams {
  signer: ethers.Signer;
  index?: number;
  entryPointAddress: string;
  factoryAddress: string;
  overheads?: Partial<GasOverheads>;
}

export class ShinkaWalletUserOpHandler {
  signer: ethers.Signer;
  index: number;
  provider: ethers.providers.Provider;
  entryPoint: EntryPoint;
  factory: ShinkaWalletDeployer;
  chainId?: ChainId;
  signerAddress?: string;
  shinkaWallet?: ShinkaWallet;
  overheads?: Partial<GasOverheads>;

  constructor(params: ShinkaWalletUserOpHandlerParams) {
    this.signer = params.signer;
    this.index = params.index || 0;
    const provider = this.signer.provider;
    if (!provider) {
      throw new Error("provider is invalid");
    }
    this.provider = provider;
    this.entryPoint = EntryPoint__factory.connect(params.entryPointAddress, this.provider);
    this.factory = ShinkaWalletDeployer__factory.connect(params.factoryAddress, this.provider);
    this.overheads = params.overheads;
  }

  async _getChainId() {
    if (!this.chainId) {
      const chainId = await this.provider.getNetwork().then((network) => {
        const chainId = String(network.chainId);
        if (!isChainId(chainId)) {
          throw new Error("chain id is invalid");
        }
        return chainId;
      });
      this.chainId = chainId;
    }
    return this.chainId;
  }

  async _getSignerAddress() {
    if (!this.signerAddress) {
      const signerAddress = await this.signer.getAddress();
      this.signerAddress = signerAddress;
    }
    return this.signerAddress;
  }

  async _getCounterFactualAddress(): Promise<string> {
    const signerAddress = await this._getSignerAddress();
    return await this.factory.getCreate2Address(this.entryPoint.address, signerAddress, this.index);
  }

  async _getShinkaWallet() {
    if (!this.shinkaWallet) {
      const shinkaWalletAddress = await this._getCounterFactualAddress();
      this.shinkaWallet = ShinkaWallet__factory.connect(shinkaWalletAddress, this.signer);
    }

    const code = await this.provider.getCode(this.shinkaWallet.address);

    return { shinkaWallet: this.shinkaWallet, isDeployed: code !== "0x" };
  }

  async _getInitCode() {
    const { isDeployed } = await this._getShinkaWallet();
    if (!isDeployed) {
      const signerAddress = await this._getSignerAddress();
      const initCode = ethers.utils.hexConcat([
        this.factory.address,
        this.factory.interface.encodeFunctionData("deployWallet", [this.entryPoint.address, signerAddress, this.index]),
      ]);
      return initCode;
    } else {
      return "0x";
    }
  }

  async _encodeExecute(target: string, value: ethers.BigNumber, data: string): Promise<string> {
    const { shinkaWallet } = await this._getShinkaWallet();
    return shinkaWallet.interface.encodeFunctionData("execFromEntryPoint", [target, value, data]);
  }

  async _getPreVerificationGas(userOp: Partial<UserOperationStruct>): Promise<number> {
    const p = await ethers.utils.resolveProperties(userOp);
    return calcPreVerificationGas(p, this.overheads);
  }

  async getWalletAddress(): Promise<string> {
    return await this._getCounterFactualAddress();
  }

  async getRequestId(userOp: UserOperationStruct): Promise<string> {
    const chainId = await this._getChainId();
    const op = await ethers.utils.resolveProperties(userOp);
    return getRequestId(op, this.entryPoint.address, Number(chainId));
  }

  async createUnsignedUserOp(info: TransactionDetailsForUserOpWithPaymasterAndData): Promise<UserOperationStruct> {
    const { shinkaWallet, isDeployed } = await this._getShinkaWallet();
    const nonce = !isDeployed ? 0 : await shinkaWallet.nonce();
    const initCode = info.passInitCode ? "0x" : await this._getInitCode();
    const value = ethers.BigNumber.from(info.value || 0);
    const callData = await this._encodeExecute(info.target, value, info.data);
    const callGasLimit =
      info.gasLimit ||
      (await this.provider.estimateGas({
        from: this.entryPoint.address,
        to: shinkaWallet.address,
        data: callData,
      }));
    let verificationGasLimit = ethers.BigNumber.from(GAS_AMOUNT_FOR_VERIFICATION);
    if (!isDeployed) {
      verificationGasLimit = verificationGasLimit.add(GAS_AMOUNT_FOR_DEPLOY);
    }
    let { maxFeePerGas, maxPriorityFeePerGas } = info;
    if (!maxFeePerGas || !maxPriorityFeePerGas) {
      const feeData = await this.provider.getFeeData();
      if (maxFeePerGas == null) {
        maxFeePerGas = feeData.maxFeePerGas ?? 0;
      }
      if (maxPriorityFeePerGas == null) {
        maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 0;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const partialUserOp: any = {
      sender: shinkaWallet.address,
      nonce,
      initCode,
      callData,
      callGasLimit,
      verificationGasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
    partialUserOp.paymasterAndData = info.paymasterAndData || "0x";
    return {
      ...partialUserOp,
      preVerificationGas: await this._getPreVerificationGas(partialUserOp),
      signature: "",
    };
  }

  async signUserOp(userOp: UserOperationStruct): Promise<UserOperationStruct> {
    const requestId = await this.getRequestId(userOp);
    const signature = await this.signer.signMessage(ethers.utils.arrayify(requestId));
    return {
      ...userOp,
      signature,
    };
  }

  async createSignedUserOp(info: TransactionDetailsForUserOpWithPaymasterAndData): Promise<UserOperationStruct> {
    const unsignedUserOp = await this.createUnsignedUserOp(info);
    return await this.signUserOp(unsignedUserOp);
  }
}
