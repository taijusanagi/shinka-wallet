import { HttpRpcClient } from "@account-abstraction/sdk/dist/src/HttpRpcClient";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useSigner } from "wagmi";

import deployments from "../../../contracts/deployments.json";
// import { ShinkaWalletAPI } from "../../../contracts/lib/ShinkaWalletAPI";
// import { UncheckedPaymasterAPI } from "../../../contracts/lib/UncheckedPaymasterAPI";
import { ShinkaWalletPaymasterHandler, ShinkaWalletUserOpHandler } from "../../../contracts/lib/account-abstraction";
import { ChainId } from "../../../contracts/types/ChainId";

export const useShinkaWalletAPI = (chainId?: ChainId) => {
  const { data: signer } = useSigner();
  const [isShinkaWalletLoading, setIsShinkaWalletLoading] = useState(false);
  const [shinkaWalletBundler, setShinkaWalletBundler] = useState<HttpRpcClient>();
  const [shinkaWalletAPI, setShinkaWalletAPI] = useState<ShinkaWalletUserOpHandler>();
  const [shinkaWalletSigner, setShinkaWalletSigner] = useState<ethers.Signer>();
  const [shinkaWalletAddress, setShinkaWalletAddress] = useState<string>();
  const [isShinkaWalletDeployed, setShinkaWalletDeployed] = useState(false);
  const [shinkaWalletBalance, setShinkaWalletBalance] = useState("0");
  const [isShinkaWalletConnected, setIsShinkaWalletConnected] = useState(false);

  useEffect(() => {
    (async () => {
      if (!chainId || !signer || !signer.provider) {
        setIsShinkaWalletConnected(false);
        setIsShinkaWalletLoading(false);
        setIsShinkaWalletConnected(false);
        setShinkaWalletBundler(undefined);
        setShinkaWalletSigner(undefined);
        setShinkaWalletAPI(undefined);
        setShinkaWalletAddress("");
        setShinkaWalletDeployed(false);
        setShinkaWalletBalance("0");
        return;
      }
      setIsShinkaWalletLoading(true);
      const shinkaWalletBundler = new HttpRpcClient(
        `${window.location.origin}/api/bundler/${chainId}/rpc`,
        deployments.entryPoint,
        Number(chainId)
      );
      setShinkaWalletBundler(shinkaWalletBundler);
      const provider = signer.provider;
      const shinkaWalletPaymasterHandler = new ShinkaWalletPaymasterHandler(deployments.paymaster);
      const shinkaWalletAPI = new ShinkaWalletUserOpHandler({
        entryPointAddress: deployments.entryPoint,
        signer,
        factoryAddress: deployments.factory,
        shinkaWalletPaymasterHandler,
      });
      setShinkaWalletSigner(signer);
      setShinkaWalletAPI(shinkaWalletAPI);
      const shinkaWalletAddress = await shinkaWalletAPI.getWalletAddress();
      setShinkaWalletAddress(shinkaWalletAddress);
      const shinkaWalletDeployedCode = await provider.getCode(shinkaWalletAddress);
      setShinkaWalletDeployed(shinkaWalletDeployedCode !== "0x");
      const ShinkaWalletBalanceBigNumber = await provider.getBalance(shinkaWalletAddress);
      const remainder = ShinkaWalletBalanceBigNumber.mod(1e14);
      const ShinkaWalletBalance = ethers.utils.formatEther(ShinkaWalletBalanceBigNumber.sub(remainder));
      setShinkaWalletBalance(ShinkaWalletBalance);
      setIsShinkaWalletLoading(false);
      setIsShinkaWalletConnected(true);
    })();
  }, [chainId, signer]);

  return {
    isShinkaWalletLoading,
    shinkaWalletBundler,
    shinkaWalletSigner,
    shinkaWalletAPI,
    shinkaWalletAddress,
    isShinkaWalletDeployed,
    shinkaWalletBalance,
    isShinkaWalletConnected,
  };
};
