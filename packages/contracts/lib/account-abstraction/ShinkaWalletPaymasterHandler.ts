import { UserOperationStruct } from "@account-abstraction/contracts";

export interface ShinkaWalletPaymasterHandlerParams {
  paymasterAddress?: string;
}

export class ShinkaWalletPaymasterHandler {
  paymasterAddress?: string;

  constructor(prams: ShinkaWalletPaymasterHandlerParams) {
    this.paymasterAddress = prams.paymasterAddress;
  }

  async getPaymasterAndData(userOp: UserOperationStruct): Promise<string> {
    return this.paymasterAddress || "0x";
  }
}
