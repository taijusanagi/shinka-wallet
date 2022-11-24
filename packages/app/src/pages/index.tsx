import { HttpRpcClient } from "@account-abstraction/sdk/dist/src/HttpRpcClient";
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Image,
  Input,
  Link,
  SimpleGrid,
  Stack,
  Text,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { useAddRecentTransaction, useConnectModal } from "@rainbow-me/rainbowkit";
import { signTypedData } from "@wagmi/core";
import WalletConnect from "@walletconnect/client";
import { convertHexToUtf8 } from "@walletconnect/utils";
import { ethers } from "ethers";
import { NextPage } from "next";
import { Router } from "next/router";
import { useEffect, useState } from "react";
import { AiOutlineQrcode } from "react-icons/ai";

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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const QrReader = require("react-qr-scanner");

const walletConnectURIStorageKey = "wallet-connect-uri";

const HomePage: NextPage = () => {
  const { connectedChainId, connectedSigner, connectedChainConfig } = useConnected();
  const {
    isShinkaWalletLoading,
    shinkaWalletBundler,
    shinkaWalletHandler,
    shinkaWalletAddress,
    isShinkaWalletDeployed,
    shinkaWalletBalance,
    isShinkaWalletConnected,
  } = useShinkaWalletHandler();

  const [walletConnectURI, setWalletConnectURI] = useState("");
  const [isWalletConnectConnecting, setIsWalletConnectConnecting] = useState(false);
  const [walletConnect, setWalletConnect] = useState<WalletConnect>();
  const [connectedApp, setConnectedApp] = useState<{ name: string; url: string }>();

  const { openConnectModal } = useConnectModal();
  const qrReaderDisclosure = useDisclosure();
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

  const clearWalletConnect = () => {
    setIsWalletConnectConnecting(false);
    setWalletConnect(undefined);
    setConnectedApp(undefined);
    setWalletConnectURI("");
    window.localStorage.removeItem(walletConnectURIStorageKey);
  };

  const closeStepModalWithClear = () => {
    setStep(0);
    setIsProcessing(false);
    setTxDetail(undefined);
    setTransactionHash("");
    stepModalDisclosure.onClose();
  };

  const connectWithWalletConnect = async (walletConnectURI: string) => {
    try {
      if (!connectedSigner || !shinkaWalletBundler || !shinkaWalletHandler || !shinkaWalletAddress) {
        throw new Error("shinka wallet is not initialized");
      }
      setIsWalletConnectConnecting(true);
      const walletConnectConnector = new WalletConnect({
        uri: walletConnectURI,
      });

      if (walletConnectConnector.connected && walletConnectConnector.peerMeta) {
        setConnectedApp({ ...walletConnectConnector.peerMeta });
        setIsWalletConnectConnecting(false);
        setWalletConnect(walletConnectConnector);
      }
      walletConnectConnector.on("session_request", async (error, payload) => {
        console.log("wallet-connect", "session_request", payload);
        if (error) {
          throw error;
        }
        console.log("wallet-connect", "approving session");
        walletConnectConnector.approveSession({ chainId: Number(connectedChainId), accounts: [shinkaWalletAddress] });
        console.log("wallet-connect", "session approved");
        const { peerMeta } = payload.params[0];
        setConnectedApp({ ...peerMeta });
        setIsWalletConnectConnecting(false);
        setWalletConnect(walletConnectConnector);
        console.log("wallet-connect", "save wallet connect uri in local storage");
        window.localStorage.setItem(walletConnectURIStorageKey, walletConnectURI);
      });
      walletConnectConnector.on("call_request", async (error, payload) => {
        console.log("wallet-connect", "call_request", payload);
        if (error) {
          throw error;
        }
        if (payload.method === "eth_sendTransaction") {
          console.log("wallet-connect", "eth_sendTransaction");
          try {
            const transactionHash = await processTx(
              shinkaWalletBundler,
              shinkaWalletHandler,
              payload.params[0].to,
              payload.params[0].data,
              payload.params[0].value,
              ethers.BigNumber.from(payload.params[0].gas)
                .add(GAS_AMOUNT_FOR_VERIFICATION)
                .add(isShinkaWalletDeployed ? "0" : GAS_AMOUNT_FOR_DEPLOY)
            );
            if (transactionHash) {
              walletConnectConnector.approveRequest({
                id: payload.id,
                result: transactionHash,
              });
            } else {
              walletConnectConnector.rejectRequest({
                id: payload.id,
              });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (e: any) {
            handleError(e);
            walletConnectConnector.rejectRequest({
              id: payload.id,
              error: e,
            });
          }
        }
        if (payload.method === "personal_sign") {
          console.log("wallet-connect", "personal_sign");
          try {
            const message = convertHexToUtf8(payload.params[0]);
            const signature = await connectedSigner.signMessage(message);
            walletConnectConnector.approveRequest({
              id: payload.id,
              result: signature,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (e: any) {
            handleError(e);
            walletConnectConnector.rejectRequest({
              id: payload.id,
              error: e,
            });
          }
        }
        if (payload.method === "eth_signTypedData") {
          console.log("wallet-connect", "eth_signTypedData");
          try {
            const { domain, message: value, types } = JSON.parse(payload.params[1]);
            delete types.EIP712Domain;
            const signature = await signTypedData({ domain, types, value });
            walletConnectConnector.approveRequest({
              id: payload.id,
              result: signature,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (e: any) {
            handleError(e);
            walletConnectConnector.rejectRequest({
              id: payload.id,
              error: e,
            });
          }
        }
      });
      walletConnectConnector.on("disconnect", (error, payload) => {
        console.log("wallet-connect", "disconnect", payload);
        if (error) {
          throw error;
        }
        clearWalletConnect();
      });
    } catch (e) {
      handleError(e);
      clearWalletConnect();
    }
  };

  useEffect(() => {
    const walletConnectURI = window.localStorage.getItem(walletConnectURIStorageKey);
    if (walletConnectURI) {
      setWalletConnectURI(walletConnectURI);
    }
  }, []);

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
      setIsProcessing(true);
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
        {connectedChainConfig && isShinkaWalletConnected && (
          <SimpleGrid spacing={4} py="4">
            <Unit header="Shinka Wallet" position="relative">
              <Flex position="absolute" top="0" right="0" p="4">
                <HStack justify={"space-between"}>
                  <Button
                    variant="ghost"
                    size="xs"
                    rounded="md"
                    fontWeight={"bold"}
                    color={configJsonFile.style.color.link}
                    // isDisabled={
                    //   !shinkaWalletBundler || !shinkaWalletHandler || !shinkaWalletAddress || isShinkaWalletDeployed
                    // }
                    onClick={async () => {
                      if (!shinkaWalletBundler || !shinkaWalletHandler || !shinkaWalletAddress) {
                        return;
                      }
                      await processTx(
                        shinkaWalletBundler,
                        shinkaWalletHandler,
                        shinkaWalletAddress,
                        "0x",
                        "0",
                        ethers.BigNumber.from(GAS_AMOUNT_FOR_DEPLOY)
                      );
                    }}
                  >
                    {isShinkaWalletDeployed ? "Deployed" : "Deploy"}
                  </Button>
                </HStack>
              </Flex>
              <Stack spacing="2">
                <Stack spacing="1">
                  <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    Address
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.link}>
                    <Link
                      href={`${connectedChainConfig.explorer.url}/address/${shinkaWalletAddress}`}
                      target={"_blank"}
                    >
                      {shinkaWalletAddress}
                    </Link>
                  </Text>
                </Stack>
                <Stack spacing="1">
                  <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    Onchain Balance:
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                    <Text as="span" mr="1">
                      {shinkaWalletBalance}
                    </Text>
                    <Text as="span">ETH</Text>
                  </Text>
                </Stack>
              </Stack>
            </Unit>
            <Unit header={"Connect with dApps"} position="relative">
              <HStack position="absolute" top="0" right="0" p="4">
                <Text fontSize="xs" color={configJsonFile.style.color.link} fontWeight="bold">
                  <Link href={"https://example.walletconnect.org"} target={"_blank"}>
                    Example
                  </Link>
                </Text>
                <Text fontSize="xs" fontWeight={"bold"}>
                  <IconButton
                    size="xs"
                    variant={"ghost"}
                    shadow="none"
                    icon={<AiOutlineQrcode size="24" />}
                    aria-label="qrcode"
                    color={configJsonFile.style.color.link}
                    cursor="pointer"
                    disabled={!!walletConnect}
                    onClick={qrReaderDisclosure.onOpen}
                  />
                </Text>
              </HStack>
              <Stack>
                <Stack spacing="3.5">
                  <Stack spacing="0">
                    <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                      Connected dApps
                    </Text>
                    {!connectedApp && (
                      <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                        None
                      </Text>
                    )}
                    {connectedApp && (
                      <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                        <Link color={configJsonFile.style.color.link} href={connectedApp.url} target={"_blank"}>
                          {connectedApp.name}
                        </Link>
                      </Text>
                    )}
                  </Stack>
                  <Stack>
                    <Input
                      placeholder={"wc:"}
                      type={"text"}
                      value={walletConnectURI}
                      fontSize="xs"
                      onChange={(e) => setWalletConnectURI(e.target.value)}
                      disabled={isWalletConnectConnecting || !!walletConnect}
                    />
                    <Button
                      onClick={
                        !walletConnect
                          ? () => connectWithWalletConnect(walletConnectURI)
                          : () => {
                              walletConnect.killSession();
                              clearWalletConnect();
                            }
                      }
                      isLoading={isWalletConnectConnecting}
                    >
                      {!walletConnect ? "Connect" : "Disconnect"}
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Unit>
            <Unit header={"dAccount Abstraction ShortCut"} position="relative">
              <Stack spacing="4">
                <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  dApps portal with bacth & automate tx
                </Text>
                <SimpleGrid columns={4} gap={4}>
                  <Image
                    src={"/assets/utils/image-placeholder.png"}
                    alt="nft"
                    rounded={configJsonFile.style.radius}
                    shadow={configJsonFile.style.shadow}
                    fit="cover"
                    width={"full"}
                    height={"full"}
                  />
                  <Image
                    src={"/assets/utils/image-placeholder.png"}
                    alt="nft"
                    rounded={configJsonFile.style.radius}
                    shadow={configJsonFile.style.shadow}
                    fit="cover"
                    width={"full"}
                    height={"full"}
                  />
                  <Image
                    src={"/assets/utils/image-placeholder.png"}
                    alt="nft"
                    rounded={configJsonFile.style.radius}
                    shadow={configJsonFile.style.shadow}
                    fit="cover"
                    width={"full"}
                    height={"full"}
                  />
                  <Image
                    src={"/assets/utils/image-placeholder.png"}
                    alt="nft"
                    rounded={configJsonFile.style.radius}
                    shadow={configJsonFile.style.shadow}
                    fit="cover"
                    width={"full"}
                    height={"full"}
                  />
                </SimpleGrid>
              </Stack>
            </Unit>
          </SimpleGrid>
        )}
      </Stack>
      <Modal isOpen={qrReaderDisclosure.isOpen} onClose={qrReaderDisclosure.onClose} header="WalletConnect QR Scanner">
        <QrReader
          delay={500}
          onScan={(result: { text: string }) => {
            if (!result) {
              return;
            }
            const walletConnectURI = result.text;
            setWalletConnectURI(walletConnectURI);
            connectWithWalletConnect(walletConnectURI);
            qrReaderDisclosure.onClose();
          }}
          onError={(err: unknown) => {
            handleError(err);
          }}
        />
      </Modal>
      <Modal
        header={"Send Account Abstraction Tx"}
        isOpen={stepModalDisclosure.isOpen}
        onClose={() => {
          closeStepModalWithClear();
        }}
      >
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
                  Shinka Wallet
                </Text>
                <Text fontSize="xx-small" color={configJsonFile.style.color.black.text.secondary}>
                  {txDetail.target}
                </Text>
              </Stack>
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
            <Button onClick={() => window.open(`${connectedChainConfig.explorer.url}/tx/${transactionHash}`, "_blank")}>
              View Tx Status
            </Button>
          )}
        </Stack>
      </Modal>
    </Layout>
  );
};

export default HomePage;
