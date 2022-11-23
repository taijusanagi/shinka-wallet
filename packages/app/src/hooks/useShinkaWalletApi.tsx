/* eslint-disable camelcase */
import { EntryPoint__factory } from "@account-abstraction/contracts";
import { HttpRpcClient } from "@account-abstraction/sdk/dist/src/HttpRpcClient";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useNetwork, useSigner } from "wagmi";

import deployments from "../../../contracts/deployments.json";
import { ShinkaWalletAPI } from "../../../contracts/lib/ShinkaWalletAPI";
import { EntryPoint } from "../../../contracts/typechain-types";
import { useConnectedChainId } from "./useConnectedChainId";

export const useShinkaWalletAPI = () => {
  const { connectedChainId } = useConnectedChainId();
  const { data: signer } = useSigner();
  const [bundler, setBundler] = useState<HttpRpcClient>();
  const [entryPoint, setEntryPoint] = useState<EntryPoint>();
  const [shinkaWalletAPI, setShinkaWalletAPI] = useState<ShinkaWalletAPI>();
  const [shinkaWalletAddress, setShinkaWalletAddress] = useState<string>();
  const [shinkaWalletBalance, setShinkaWalletBalance] = useState("0");

  useEffect(() => {
    (async () => {
      if (!connectedChainId || !signer || !signer.provider) {
        setShinkaWalletAPI(undefined);
        setShinkaWalletAddress("");
        return;
      }
      const bundler = new HttpRpcClient(
        `${window.location.origin}/api/bundler/${connectedChainId}/rpc`,
        deployments.entryPoint,
        Number(connectedChainId)
      );
      setBundler(bundler);
      const provider = signer.provider;
      const shinkaWalletAPI = new ShinkaWalletAPI({
        provider,
        entryPointAddress: deployments.entryPoint,
        owner: signer,
        factoryAddress: deployments.factory,
        index: 0,
      });
      setShinkaWalletAPI(shinkaWalletAPI);
      const shinkaWalletAddress = await shinkaWalletAPI.getWalletAddress();
      setShinkaWalletAddress(shinkaWalletAddress);
      const ShinkaWalletBalanceBigNumber = await provider.getBalance(shinkaWalletAddress);
      const remainder = ShinkaWalletBalanceBigNumber.mod(1e14);
      const ShinkaWalletBalance = ethers.utils.formatEther(ShinkaWalletBalanceBigNumber.sub(remainder));
      setShinkaWalletBalance(ShinkaWalletBalance);
      const entryPoint = EntryPoint__factory.connect(deployments.entryPoint, signer);
      setEntryPoint(entryPoint);
    })();
  }, [connectedChainId, signer]);

  const getTransactionHashByRequestID = async (requestId: string) => {
    if (!signer || !signer.provider || !entryPoint) {
      throw new Error("signer or provider invalid");
    }
    const provider = signer.provider;
    const filter = entryPoint.filters.UserOperationEvent(requestId);
    const transactionHash: string = await new Promise((resolve) => {
      const intervalId = setInterval(async () => {
        console.log("fetching request status...");
        const logs = await provider.getLogs(filter);
        if (logs.length > 0) {
          clearInterval(intervalId);
          const [{ transactionHash }] = logs;
          resolve(transactionHash);
        }
      }, 1000);
    });

    return transactionHash;
  };

  return {
    bundler,
    entryPoint,
    shinkaWalletAPI,
    shinkaWalletAddress,
    shinkaWalletBalance,
    getTransactionHashByRequestID,
  };
};
