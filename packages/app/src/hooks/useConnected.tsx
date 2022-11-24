import { useMemo } from "react";
import { useNetwork, useSigner } from "wagmi";

import networkJsonFile from "../../../contracts/network.json";
import { isChainId } from "../../../contracts/types/ChainId";

export const useConnected = () => {
  const { chain } = useNetwork();
  const { data: connectedSigner } = useSigner();

  const isConnected = useMemo(() => {
    return !!connectedSigner;
  }, [connectedSigner]);

  const connectedChainId = useMemo(() => {
    if (!chain) {
      return;
    }
    const chainId = String(chain.id);
    if (!isChainId(chainId)) {
      return;
    }
    return chainId;
  }, [chain]);

  const connectedChainConfig = useMemo(() => {
    if (!connectedChainId) {
      return;
    }
    return networkJsonFile[connectedChainId];
  }, [connectedChainId]);

  return { isConnected, connectedChainId, connectedSigner, connectedChainConfig };
};
