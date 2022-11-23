import { UserOperationStruct } from "@account-abstraction/contracts";
import { PaymasterAPI } from "@account-abstraction/sdk";

export class UncheckedPaymasterAPI extends PaymasterAPI {
  address?: string;

  constructor(address: string) {
    super();
    this.address = address;
  }

  async getPaymasterAndData(userOp: Partial<UserOperationStruct>): Promise<string | undefined> {
    return this.address;
  }
}
