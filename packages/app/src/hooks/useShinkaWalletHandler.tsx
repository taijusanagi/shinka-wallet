/* eslint-disable camelcase */
import { HttpRpcClient } from "@account-abstraction/sdk/dist/src/HttpRpcClient";
import { ethers } from "ethers";
import { useEffect, useState } from "react";

import { useConnected } from "@/hooks/useConnected";

import { ShinkaWalletPaymasterHandler, ShinkaWalletUserOpHandler } from "../../../contracts/lib/account-abstraction";
import {
  ShinkaWallet,
  ShinkaWallet__factory,
  ShinkaWalletPaymaster,
  ShinkaWalletPaymaster__factory,
} from "../../../contracts/typechain-types";
import { useIsSignedIn } from "./useIsSignedIn";

export const useShinkaWalletHandler = () => {
  const { connectedChainId, connectedSigner, connectedChainConfig } = useConnected();
  const { isSignedIn } = useIsSignedIn();

  const [isShinkaWalletLoading, setIsShinkaWalletLoading] = useState(false);
  const [shinkaWalletBundler, setShinkaWalletBundler] = useState<HttpRpcClient>();
  const [shinkaWalletHandler, setShinkaWalletHandler] = useState<ShinkaWalletUserOpHandler>();
  const [shinkaWalletAddress, setShinkaWalletAddress] = useState("");
  const [shinkaWalletContract, setShinkaWalletContract] = useState<ShinkaWallet>();
  const [isShinkaWalletDeployed, setShinkaWalletDeployed] = useState(false);
  const [shinkaWalletGuardian, setShinkaWalletGuardian] = useState("");
  const [shinkaWalletBalance, setShinkaWalletBalance] = useState("0");
  const [isPremiumActivated, setIsPremiumActivated] = useState(false);
  const [isPossibleToPass, setIsPossibleToPass] = useState(false);
  const [paymasterContract, setPaymasterContract] = useState<ShinkaWalletPaymaster>();
  const [isShinkaWalletConnected, setIsShinkaWalletConnected] = useState(false);

  useEffect(() => {
    (async () => {
      if (!connectedChainId || !connectedSigner || !connectedChainConfig || !isSignedIn || !connectedSigner.provider) {
        setIsShinkaWalletConnected(false);
        setIsShinkaWalletLoading(false);
        setIsShinkaWalletConnected(false);
        setShinkaWalletBundler(undefined);
        setShinkaWalletHandler(undefined);
        setShinkaWalletAddress("");
        setShinkaWalletDeployed(false);
        setShinkaWalletGuardian("");
        setShinkaWalletBalance("0");
        return;
      }
      setIsShinkaWalletLoading(true);
      const shinkaWalletBundler = new HttpRpcClient(
        `${window.location.origin}/api/bundler/${connectedChainId}/rpc`,
        connectedChainConfig.deployments.entryPoint,
        Number(connectedChainId)
      );
      setShinkaWalletBundler(shinkaWalletBundler);
      const shinkaWalletPaymasterHandler = new ShinkaWalletPaymasterHandler(connectedChainConfig.deployments.paymaster);
      const shinkaWalletHandler = new ShinkaWalletUserOpHandler({
        entryPointAddress: connectedChainConfig.deployments.entryPoint,
        signer: connectedSigner,
        factoryAddress: connectedChainConfig.deployments.factory,
        shinkaWalletPaymasterHandler,
      });
      setShinkaWalletHandler(shinkaWalletHandler);
      const shinkaWalletAddress = await shinkaWalletHandler.getWalletAddress();
      setShinkaWalletAddress(shinkaWalletAddress);
      const shinkaWalletContract = ShinkaWallet__factory.connect(shinkaWalletAddress, connectedSigner);
      setShinkaWalletContract(shinkaWalletContract);
      const shinkaWalletDeployedCode = await connectedSigner.provider.getCode(shinkaWalletAddress);
      const isShinkaWalletDeployed = shinkaWalletDeployedCode !== "0x";
      setShinkaWalletDeployed(isShinkaWalletDeployed);
      if (isShinkaWalletDeployed) {
        const shinkaWalletGuardian = await shinkaWalletContract.guardian();
        setShinkaWalletGuardian(shinkaWalletGuardian);
      }

      const ShinkaWalletBalanceBigNumber = await connectedSigner.provider.getBalance(shinkaWalletAddress);
      const remainder = ShinkaWalletBalanceBigNumber.mod(1e14);
      const ShinkaWalletBalance = ethers.utils.formatEther(ShinkaWalletBalanceBigNumber.sub(remainder));
      setShinkaWalletBalance(ShinkaWalletBalance);
      const paymasterContract = ShinkaWalletPaymaster__factory.connect(
        connectedChainConfig.deployments.paymaster,
        connectedSigner
      );
      const isPremiumActivated = await paymasterContract.isPremium(await connectedSigner.getAddress());
      setIsPremiumActivated(isPremiumActivated);
      const isPossibleToPass = await paymasterContract.isPossibleToPass(await connectedSigner.getAddress());
      setIsPossibleToPass(isPossibleToPass);
      setIsShinkaWalletLoading(false);
      setIsShinkaWalletConnected(true);
      setPaymasterContract(paymasterContract);
    })();
  }, [connectedChainId, connectedSigner, connectedChainConfig, isSignedIn]);

  return {
    isShinkaWalletLoading,
    shinkaWalletBundler,
    shinkaWalletHandler,
    shinkaWalletAddress,
    shinkaWalletContract,
    isShinkaWalletDeployed,
    shinkaWalletGuardian,
    shinkaWalletBalance,
    isPremiumActivated,
    isPossibleToPass,
    isShinkaWalletConnected,
    paymasterContract,
    setIsPossibleToPass,
  };
};
