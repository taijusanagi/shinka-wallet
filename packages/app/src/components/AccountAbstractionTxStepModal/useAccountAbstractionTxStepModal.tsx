import { useDisclosure } from "@chakra-ui/react";
import { useAddRecentTransaction } from "@rainbow-me/rainbowkit";
import { useState } from "react";

import { useStep } from "@/components/Step";
import { Tx } from "@/types/Tx";

import { useErrorToast } from "../../hooks/useErrorToast";
import { useShinkaWallet } from "../../hooks/useShinkaWallet";
import { steps } from "./steps";

export const useAccountAbstractionTxStepModal = () => {
  const { shinkaWallet } = useShinkaWallet();

  const [accountAbstractionTx, setAccountAbstractionTx] = useState<Tx>();
  const [currentStep, isProcessing, { setStep, setIsProcessing }] = useStep({
    maxStep: steps.length,
    initialStep: 0,
  });
  const [hash, setHash] = useState("");

  const { isOpen, onOpen, onClose } = useDisclosure();
  const addRecentTransaction = useAddRecentTransaction();

  const errorToast = useErrorToast();

  const clear = () => {
    onClose();
    setStep(0);
    setIsProcessing(false);
    setAccountAbstractionTx(undefined);
    setHash("");
  };

  const handle = async (accountAbstractionTx: Tx) => {
    try {
      if (!shinkaWallet) {
        throw new Error("shinka wallet is not initialized");
      }
      setStep(0);
      setAccountAbstractionTx(accountAbstractionTx);
      onOpen();
      const op = await shinkaWallet.userOpHandler.createSignedUserOp(accountAbstractionTx);
      setIsProcessing(false);
      setStep(1);
      setIsProcessing(true);
      const transactionHash = await shinkaWallet.bundlerClient.sendUserOpToBundler(op);
      addRecentTransaction({ hash: transactionHash, description: "Account Abstraction Tx" });
      setIsProcessing(false);
      setStep(2);
      setHash(transactionHash);
      return transactionHash;
    } catch (e) {
      errorToast.open(e);
      clear();
    }
  };

  return { accountAbstractionTx, currentStep, isProcessing, hash, isOpen, onOpen, onClose, handle };
};
