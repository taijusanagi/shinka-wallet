import { useContext } from "react";

import { ShinkaWalletContext } from "@/contexts/ShinkaWalletContext";

export const useShinkaWallet = () => {
  const { shinkaWallet } = useContext(ShinkaWalletContext);
  return {
    shinkaWallet,
  };
};
