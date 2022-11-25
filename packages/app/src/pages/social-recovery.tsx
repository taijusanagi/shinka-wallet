import { HttpRpcClient } from "@account-abstraction/sdk/dist/src/HttpRpcClient";
import { Box, Button, HStack, Image, Input, SimpleGrid, Stack, Text, useDisclosure, VStack } from "@chakra-ui/react";
import { useAddRecentTransaction, useConnectModal } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { NextPage } from "next";
import { useState } from "react";

import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { Step, steps, useStep } from "@/components/Step";
import { Unit } from "@/components/Unit";
import { useConnected } from "@/hooks/useConnected";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useShinkaWalletHandler } from "@/hooks/useShinkaWalletHandler";

import { GAS_AMOUNT_FOR_DEPLOY, GAS_AMOUNT_FOR_VERIFICATION } from "../../../contracts/config";
import { ShinkaWalletUserOpHandler } from "../../../contracts/lib/account-abstraction";
import configJsonFile from "../../config.json";

const HomePage: NextPage = () => {
  const { connectedSigner, connectedChainConfig } = useConnected();
  const {
    paymasterContract,
    isShinkaWalletLoading,
    shinkaWalletBundler,
    shinkaWalletHandler,
    shinkaWalletAddress,
    shinkaWalletContract,
    isShinkaWalletDeployed,
    shinkaWalletGuardian,

    isPossibleToPass,
    isShinkaWalletConnected,
    setIsPossibleToPass,
  } = useShinkaWalletHandler();

  const [guardian, setGuardian] = useState("");
  const { openConnectModal } = useConnectModal();

  const stepModalDisclosure = useDisclosure();

  const [currentStep, isTxProcessing, { setStep, setIsProcessing }] = useStep({
    maxStep: steps.length,
    initialStep: 0,
  });

  const [txDetail, setTxDetail] = useState<{
    target: string;
    data: string;
    value: ethers.BigNumberish;
    gasLimit: ethers.BigNumberish;
  }>();

  const [transactionHash, setTransactionHash] = useState("");

  const addRecentTransaction = useAddRecentTransaction();
  const { handleError } = useErrorHandler();

  const closeStepModalWithClear = () => {
    setStep(0);
    setIsProcessing(false);
    setTxDetail(undefined);
    setTransactionHash("");
    stepModalDisclosure.onClose();
  };

  const processTx = async (
    shinkaWalletBundler: HttpRpcClient,
    shinkaWalletHandler: ShinkaWalletUserOpHandler,
    target: string,
    data: string,
    value: ethers.BigNumberish,
    gasLimit: ethers.BigNumberish
  ) => {
    try {
      setTxDetail({ target, data, value, gasLimit });
      setStep(0);
      stepModalDisclosure.onOpen();
      const address = await connectedSigner?.getAddress();
      const isPossibleToPass = await paymasterContract!.isPossibleToPass(address as string);
      console.log(isPossibleToPass);
      setIsPossibleToPass(isPossibleToPass);
      if (!isPossibleToPass) {
        return;
      }
      const op = await shinkaWalletHandler.createSignedUserOp({
        target,
        data,
        value,
        gasLimit,
      });
      setIsProcessing(false);
      setStep(1);
      setIsProcessing(true);
      const transactionHash = await shinkaWalletBundler.sendUserOpToBundler(op);
      addRecentTransaction({ hash: transactionHash, description: "Account Abstraction Tx" });
      setIsProcessing(false);
      setStep(2);
      setTransactionHash(transactionHash);
      return transactionHash;
    } catch (e) {
      handleError(e);
      closeStepModalWithClear();
    }
  };

  return (
    <Layout isLoading={isShinkaWalletLoading}>
      <Stack spacing="8">
        {!isShinkaWalletConnected && (
          <Stack spacing="6" py={"28"}>
            <VStack maxW="2xl" mx="auto" px={{ base: "4", md: "0" }} spacing="2">
              <Image src="/assets/hero.png" w="96" mx="auto" alt="logo" />
              <Text
                textAlign={"center"}
                fontSize={{ base: "md", md: "xl" }}
                fontWeight={"bold"}
                color={configJsonFile.style.color.accent}
              >
                {configJsonFile.description}
              </Text>
            </VStack>
            <VStack>
              <HStack spacing="2">
                <Button variant="secondary" onClick={() => window.open(configJsonFile.url.docs, "_blank")}>
                  Docs
                </Button>
                <Button onClick={openConnectModal}>Connect Wallet</Button>
              </HStack>
            </VStack>
          </Stack>
        )}
        {connectedChainConfig &&
          isShinkaWalletConnected &&
          shinkaWalletBundler &&
          shinkaWalletHandler &&
          shinkaWalletAddress &&
          shinkaWalletContract && (
            <SimpleGrid columns={{ base: 1, md: 1 }} spacing={4} py="6">
              <Unit header="Social Recovery Guardian" position="relative">
                <Stack>
                  <Input
                    placeholder={"0x"}
                    type={"text"}
                    fontSize="xs"
                    value={shinkaWalletGuardian || guardian}
                    disabled={!!shinkaWalletGuardian}
                    onChange={(e) => setGuardian(e.target.value)}
                  />
                  <Button
                    disabled={!!shinkaWalletGuardian || !guardian || !ethers.utils.isAddress(guardian)}
                    onClick={async () => {
                      const data = shinkaWalletContract.interface.encodeFunctionData("setGuardian", [guardian]);
                      const gasLimit = await shinkaWalletContract.estimateGas.setGuardian(guardian);
                      await processTx(
                        shinkaWalletBundler,
                        shinkaWalletHandler,
                        shinkaWalletAddress,
                        data,
                        "0",
                        gasLimit
                          .add(GAS_AMOUNT_FOR_VERIFICATION)
                          .add(isShinkaWalletDeployed ? "0" : GAS_AMOUNT_FOR_DEPLOY)
                      );
                    }}
                  >
                    Set
                  </Button>
                </Stack>
              </Unit>
            </SimpleGrid>
          )}
      </Stack>
      <Modal
        header={"Send Account Abstraction Tx"}
        isOpen={stepModalDisclosure.isOpen}
        onClose={() => {
          closeStepModalWithClear();
        }}
      >
        <Stack spacing="8">
          {!isPossibleToPass && (
            <Stack>
              <Text fontSize="xs" fontWeight={"bold"} color="red.400">
                * Free Tx is only allowed for 1 time in 4 hours
              </Text>
              <Text fontSize="xs" fontWeight={"bold"} color="red.400">
                * Please activate premium offchain payment or deposit
              </Text>
            </Stack>
          )}
          <Stack spacing="4">
            <Box>
              {steps.map((step, id) => (
                <Step
                  key={id}
                  title={step.title}
                  description={step.description}
                  isActive={currentStep === id}
                  isCompleted={currentStep > id}
                  isTxProcessing={isTxProcessing}
                  isLastStep={steps.length === id + 1}
                />
              ))}
            </Box>
            {connectedChainConfig && txDetail && (
              <Stack
                spacing="2"
                py="2"
                px="4"
                boxShadow={configJsonFile.style.shadow}
                borderRadius={configJsonFile.style.radius}
                bgColor={configJsonFile.style.color.white.bg}
              >
                <Stack spacing="1">
                  <Text fontSize="x-small" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    To
                  </Text>
                  <Text fontSize="xx-small" color={configJsonFile.style.color.black.text.secondary}>
                    {txDetail.target}
                  </Text>
                </Stack>
                <Stack spacing="1">
                  <Text fontSize="x-small" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    Data
                  </Text>
                  <Text fontSize="xx-small" color={configJsonFile.style.color.black.text.secondary}>
                    {txDetail.data}
                  </Text>
                </Stack>
                <Stack spacing="1">
                  <Text fontSize="x-small" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    Value
                  </Text>
                  <Text fontSize="xx-small" color={configJsonFile.style.color.black.text.secondary}>
                    {txDetail.value.toString()} {connectedChainConfig?.currency}
                  </Text>
                </Stack>
                <Stack spacing="1">
                  <Text fontSize="x-small" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    GasLimit
                  </Text>
                  <Text fontSize="xx-small" color={configJsonFile.style.color.black.text.secondary}>
                    {txDetail.gasLimit.toString()}
                  </Text>
                </Stack>
              </Stack>
            )}
            {connectedChainConfig && transactionHash && (
              <Button
                onClick={() => window.open(`${connectedChainConfig.explorer.url}/tx/${transactionHash}`, "_blank")}
              >
                View Tx Status
              </Button>
            )}
          </Stack>
        </Stack>
      </Modal>
    </Layout>
  );
};

export default HomePage;
