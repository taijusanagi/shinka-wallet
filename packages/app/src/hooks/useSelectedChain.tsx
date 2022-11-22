import { useMemo } from "react";

import networkJsonFile from "../../../contracts/network.json";
import { ChainId } from "../../../contracts/types/ChainId";

export const useSelectedChain = (chainId?: ChainId) => {
  const config = useMemo(() => {
    if (!chainId) {
      return;
    }
    return networkJsonFile[chainId];
  }, [chainId]);

  return { config };
};
