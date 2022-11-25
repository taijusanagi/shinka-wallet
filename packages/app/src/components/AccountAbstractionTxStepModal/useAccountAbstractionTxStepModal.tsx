import { useDisclosure } from "@chakra-ui/react";
import { useAddRecentTransaction } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { useState } from "react";

import { useStep } from "@/components/Step";
import { useConnected } from "@/hooks/useConnected";
import { Tx } from "@/types/Tx";

import { GAS_AMOUNT_FOR_DEPLOY, GAS_AMOUNT_FOR_VERIFICATION } from "../../../../contracts/config";
import { useErrorToast } from "../../hooks/useErrorToast";
import { useShinkaWallet } from "../../hooks/useShinkaWallet";
import { steps } from "./steps";
import { AccountAbstractionTxStepModalMode, PaymentMethod } from "./types";

export const useAccountAbstractionTxStepModal = () => {
  const { connected } = useConnected();
  const { shinkaWallet } = useShinkaWallet();

  const [accountAbstractionTx, setAccountAbstractionTx] = useState<Tx>();
  const [mode, setMode] = useState<AccountAbstractionTxStepModalMode>("choosePaymentMethod");

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
    setMode("choosePaymentMethod");
  };

  const start = (accountAbstractionTx: Tx) => {
    setAccountAbstractionTx(accountAbstractionTx);
    onOpen();
  };

  const choosePaymentMethod = (paymentMethod: PaymentMethod) => {
    console.log("start", paymentMethod);

    setMode("processTx");
    processTx(paymentMethod);
  };

  const processTx = async (paymentMethod: PaymentMethod) => {
    try {
      if (!connected) {
        throw new Error("shinka wallet is not initialized");
      }
      if (!shinkaWallet) {
        throw new Error("shinka wallet is not initialized");
      }
      if (!accountAbstractionTx) {
        throw new Error("account abstraction tx is not set");
      }
      const paymasterAndData =
        paymentMethod === "eth"
          ? "0x"
          : paymentMethod === "creditCard"
          ? await shinkaWallet.paymasterContract.encodePaymasterAndData("0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF")
          : await shinkaWallet.paymasterContract.encodePaymasterAndData(
              connected.networkConfig.deployments.paymentToken
            );
      setStep(0);
      const op = await shinkaWallet.userOpHandler.createSignedUserOp({
        ...accountAbstractionTx,
        gasLimit: ethers.BigNumber.from(accountAbstractionTx.gasLimit)
          .add(GAS_AMOUNT_FOR_VERIFICATION)
          .add(!shinkaWallet.isDeployed ? GAS_AMOUNT_FOR_DEPLOY : 0),
        paymasterAndData,
      });
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

  return {
    mode,
    accountAbstractionTx,
    currentStep,
    isProcessing,
    hash,
    isOpen,
    onOpen,
    clear,
    start,
    choosePaymentMethod,
    processTx,
  };
};
