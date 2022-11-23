import { HttpRpcClient } from "@account-abstraction/sdk/dist/src/HttpRpcClient";
import { ethers } from "ethers";
import { useEffect, useState } from "react";

import { useConnected } from "@/hooks/useConnected";

import { ShinkaWalletPaymasterHandler, ShinkaWalletUserOpHandler } from "../../../contracts/lib/account-abstraction";

export const useShinkaWalletHandler = () => {
  const { connectedChainId, connectedSigner, connectedChainConfig } = useConnected();

  const [isShinkaWalletLoading, setIsShinkaWalletLoading] = useState(false);
  const [shinkaWalletBundler, setShinkaWalletBundler] = useState<HttpRpcClient>();
  const [shinkaWalletHandler, setShinkaWalletHandler] = useState<ShinkaWalletUserOpHandler>();
  const [shinkaWalletAddress, setShinkaWalletAddress] = useState<string>();
  const [isShinkaWalletDeployed, setShinkaWalletDeployed] = useState(false);
  const [shinkaWalletBalance, setShinkaWalletBalance] = useState("0");
  const [isShinkaWalletConnected, setIsShinkaWalletConnected] = useState(false);

  useEffect(() => {
    (async () => {
      if (!connectedChainId || !connectedSigner || !connectedChainConfig || !connectedSigner.provider) {
        setIsShinkaWalletConnected(false);
        setIsShinkaWalletLoading(false);
        setIsShinkaWalletConnected(false);
        setShinkaWalletBundler(undefined);
        setShinkaWalletHandler(undefined);
        setShinkaWalletAddress("");
        setShinkaWalletDeployed(false);
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
      const shinkaWalletDeployedCode = await connectedSigner.provider.getCode(shinkaWalletAddress);
      setShinkaWalletDeployed(shinkaWalletDeployedCode !== "0x");
      const ShinkaWalletBalanceBigNumber = await connectedSigner.provider.getBalance(shinkaWalletAddress);
      const remainder = ShinkaWalletBalanceBigNumber.mod(1e14);
      const ShinkaWalletBalance = ethers.utils.formatEther(ShinkaWalletBalanceBigNumber.sub(remainder));
      setShinkaWalletBalance(ShinkaWalletBalance);
      setIsShinkaWalletLoading(false);
      setIsShinkaWalletConnected(true);
    })();
  }, [connectedChainId, connectedSigner, connectedChainConfig]);

  return {
    isShinkaWalletLoading,
    shinkaWalletBundler,
    shinkaWalletHandler,
    shinkaWalletAddress,
    isShinkaWalletDeployed,
    shinkaWalletBalance,
    isShinkaWalletConnected,
  };
};
