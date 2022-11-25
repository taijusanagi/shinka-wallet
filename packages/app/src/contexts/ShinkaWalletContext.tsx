/* eslint-disable camelcase */
import { HttpRpcClient } from "@account-abstraction/sdk/dist/src/HttpRpcClient";
import { ethers } from "ethers";
import { createContext, useContext, useEffect, useState } from "react";

import { ShinkaWalletUserOpHandler } from "../../../contracts/lib/account-abstraction";
import {
  ShinkaWallet,
  ShinkaWallet__factory,
  ShinkaWalletPaymaster,
  ShinkaWalletPaymaster__factory,
} from "../../../contracts/typechain-types";
import { AuthContext } from "./AuthContext";
import { ConnectedContext } from "./ConnectedContext";

export interface ShinkaWalletContextValue {
  bundlerClient: HttpRpcClient;
  paymasterContract: ShinkaWalletPaymaster;
  userOpHandler: ShinkaWalletUserOpHandler;
  address: string;
  contract: ShinkaWallet;
  isDeployed: boolean;
  signerAddress: string;
  guardianAddress: string;
  ethBalanceBigNumber: ethers.BigNumber;
  ethFormatedBalance: string;
  paymentTokenBalanceBigNumber: ethers.BigNumber;
  paymentTokenFormatedBalance: string;
  creditBalanceBigNumber: ethers.BigNumber;
  creditFormatedBalance: string;
}

export interface ShinkaWalletContext {
  shinkaWallet?: ShinkaWalletContextValue;
}

export const defaultShinkaWalletContextValue = {
  shinkaWallet: undefined,
};

export const ShinkaWalletContext = createContext<ShinkaWalletContext>(defaultShinkaWalletContextValue);

export interface ShinkaWalletContextProviderProps {
  children: React.ReactNode;
}

export const ShinkaWalletContextProvider: React.FC<ShinkaWalletContextProviderProps> = ({ children }) => {
  const { connected } = useContext(ConnectedContext);
  const { auth } = useContext(AuthContext);

  const [shinkaWallet, setShinkaWallet] = useState<ShinkaWalletContextValue>();

  const [isIntervalSet, setIsIntervalSet] = useState(false);

  useEffect(() => {
    (async () => {
      if (!connected || !auth) {
        setShinkaWallet(undefined);
        return;
      }
      const load = async () => {
        const bundlerClient = new HttpRpcClient(
          `${window.location.origin}/api/bundler/${connected.chainId}/rpc`,
          connected.networkConfig.deployments.entryPoint,
          Number(connected.chainId)
        );
        const paymasterContract = ShinkaWalletPaymaster__factory.connect(
          connected.networkConfig.deployments.paymaster,
          connected.provider
        );
        const userOpHandler = new ShinkaWalletUserOpHandler({
          entryPointAddress: connected.networkConfig.deployments.entryPoint,
          signer: connected.signer,
          factoryAddress: connected.networkConfig.deployments.factory,
        });
        const address = await userOpHandler.getWalletAddress();
        const contract = ShinkaWallet__factory.connect(address, connected.signer);
        const isDeployed = await connected.provider
          .getCode(address)
          .then((code) => code !== "0x")
          .catch(() => false);
        const signerAddress = connected.signerAddress;
        const guardianAddress = await contract.guardian().catch(() => "");
        const ethBalanceBigNumber = await connected.provider.getBalance(address);
        const ethFormatedBalance = ethers.utils.formatEther(ethBalanceBigNumber);
        const paymentTokenBalanceBigNumber = await connected.paymentToken.balanceOf(address);
        const paymentTokenFormatedBalance = ethers.utils.formatUnits(paymentTokenBalanceBigNumber, 6);
        const creditBalanceBigNumber = await paymasterContract.balanceWithCreditCardPayment(signerAddress);
        const creditFormatedBalance = ethers.utils.formatEther(creditBalanceBigNumber);
        setShinkaWallet({
          bundlerClient,
          paymasterContract,
          userOpHandler,
          address,
          contract,
          isDeployed,
          signerAddress,
          guardianAddress,
          ethBalanceBigNumber,
          ethFormatedBalance,
          paymentTokenBalanceBigNumber,
          paymentTokenFormatedBalance,
          creditBalanceBigNumber,
          creditFormatedBalance,
        });
      };
      load();

      if (!isIntervalSet) {
        setIsIntervalSet(true);
        setInterval(async () => {
          load();
        }, 10000);
      }
    })();
  }, [connected, auth]);

  return <ShinkaWalletContext.Provider value={{ shinkaWallet }}>{children}</ShinkaWalletContext.Provider>;
};
