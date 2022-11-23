import { UserOperationStruct } from "@account-abstraction/contracts";

export class ShinkaWalletPaymasterHandler {
  paymasterAddress?: string;

  constructor(paymasterAddress?: string) {
    this.paymasterAddress = paymasterAddress;
  }

  async getPaymasterAndData(userOp: UserOperationStruct): Promise<string> {
    return this.paymasterAddress || "0x";
  }
}
