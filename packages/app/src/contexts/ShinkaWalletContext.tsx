/* eslint-disable camelcase */
import { HttpRpcClient } from "@account-abstraction/sdk/dist/src/HttpRpcClient";
import { ethers } from "ethers";
import { createContext, useContext, useEffect, useState } from "react";

import { ShinkaWalletPaymasterHandler, ShinkaWalletUserOpHandler } from "../../../contracts/lib/account-abstraction";
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
  paymasterHandler: ShinkaWalletPaymasterHandler;
  userOpHandler: ShinkaWalletUserOpHandler;
  address: string;
  contract: ShinkaWallet;
  signerAddress: string;
  guardianAddress: string;
  onChainBalance: ethers.BigNumberish;
  offChainBalance: ethers.BigNumberish;
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

  useEffect(() => {
    (async () => {
      if (!connected || !auth) {
        setShinkaWallet(undefined);
        return;
      }
      const bundlerClient = new HttpRpcClient(
        `${window.location.origin}/api/bundler/${connected.chainId}/rpc`,
        connected.networkConfig.deployments.entryPoint,
        Number(connected.chainId)
      );
      const paymasterContract = ShinkaWalletPaymaster__factory.connect(
        connected.networkConfig.deployments.paymaster,
        connected.provider
      );
      const paymasterHandler = new ShinkaWalletPaymasterHandler(connected.networkConfig.deployments.paymaster);
      const userOpHandler = new ShinkaWalletUserOpHandler({
        entryPointAddress: connected.networkConfig.deployments.entryPoint,
        signer: connected.signer,
        factoryAddress: connected.networkConfig.deployments.factory,
        shinkaWalletPaymasterHandler: paymasterHandler,
      });
      const address = await userOpHandler.getWalletAddress();
      const contract = ShinkaWallet__factory.connect(address, connected.signer);
      const signerAddress = connected.signerAddress;
      const guardianAddress = await contract.guardian().catch(() => "");
      const onChainBalanceBigNumber = await connected.provider.getBalance(address);
      const remainder = onChainBalanceBigNumber.mod(1e14);
      const onChainBalance = ethers.utils.formatEther(onChainBalanceBigNumber.sub(remainder));
      const offChainBalance = "0";
      setShinkaWallet({
        bundlerClient,
        paymasterContract,
        paymasterHandler,
        userOpHandler,
        address,
        contract,
        signerAddress,
        guardianAddress,
        onChainBalance,
        offChainBalance,
      });
    })();
  }, [connected, auth]);

  return <ShinkaWalletContext.Provider value={{ shinkaWallet }}>{children}</ShinkaWalletContext.Provider>;
};
