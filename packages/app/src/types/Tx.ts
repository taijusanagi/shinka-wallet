import { ethers } from "ethers";

export interface Tx {
  target: string;
  data: string;
  value: ethers.BigNumberish;
  gasLimit: ethers.BigNumberish;
}
