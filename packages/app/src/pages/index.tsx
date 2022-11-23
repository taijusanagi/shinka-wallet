/* eslint-disable camelcase */
import {
  Button,
  Flex,
  HStack,
  Icon,
  Image,
  Input,
  Link,
  SimpleGrid,
  Stack,
  Text,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { loadStripe } from "@stripe/stripe-js";
import { signTypedData } from "@wagmi/core";
import WalletConnect from "@walletconnect/client";
import { convertHexToUtf8 } from "@walletconnect/utils";
import { NextPage } from "next";
import { useState } from "react";
import { AiOutlineQrcode } from "react-icons/ai";
import { useSigner } from "wagmi";

import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { Unit } from "@/components/Unit";
import { useConnectedChainId } from "@/hooks/useConnectedChainId";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useIsWalletConnected } from "@/hooks/useIsWalletConnected";
import { useSelectedChain } from "@/hooks/useSelectedChain";
import { useShinkaWalletAPI } from "@/hooks/useShinkaWalletApi";
import { compareInLowerCase } from "@/lib/utils";

import configJsonFile from "../../config.json";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const QrReader = require("react-qr-scanner");

const HomePage: NextPage = () => {
  const { isWalletConnected } = useIsWalletConnected();
  const { connectedChainId } = useConnectedChainId();
  const { config: connectedChainConfig } = useSelectedChain(connectedChainId);
  const { data: signer } = useSigner();

  const { shinkaWalletAddress, bundler, shinkaWalletAPI, getTransactionHashByRequestID } = useShinkaWalletAPI();

  const [walletConnectURI, setWalletConnectURI] = useState("");
  const [isWalletConnectConnecting, setIsWalletConnectConnecting] = useState(false);
  const [isWalletConnectSessionEstablished, setIsWalletConnectSessionEstablished] = useState(false);
  const [connectedApp, setConnectedApp] = useState<{ name: string; url: string }>();

  const [transactionHash, setTransactionHash] = useState("");

  const { handleError } = useErrorHandler();
  const qrReaderDisclosure = useDisclosure();

  const { openConnectModal } = useConnectModal();

  const onQRReaderScan = (result: { text: string }) => {
    if (!result) {
      return;
    }
    const walletConnectURI = result.text;
    setWalletConnectURI(walletConnectURI);
    connectWithWalletConnect(walletConnectURI);
    qrReaderDisclosure.onClose();
  };
  const onQRReaderError = (err: unknown) => {
    handleError(err);
  };

  const clearWalletConnect = () => {
    setConnectedApp(undefined);
    setIsWalletConnectConnecting(false);
    setIsWalletConnectSessionEstablished(false);
  };

  const connectWithWalletConnect = async (walletConnectURI: string) => {
    if (!connectedChainId || !signer || !bundler || !shinkaWalletAPI || !shinkaWalletAddress) {
      return;
    }
    setIsWalletConnectConnecting(true);
    try {
      let walletConnectConnector = new WalletConnect({
        uri: walletConnectURI,
      });
      if (walletConnectConnector.connected) {
        console.log("kill previous session and recreate session");

        await walletConnectConnector.killSession();
        walletConnectConnector = new WalletConnect({
          uri: walletConnectURI,
        });
      }
      walletConnectConnector.on("session_request", async (error, payload) => {
        console.log("session_request", payload);
        if (error) {
          throw error;
        }
        console.log("approving session");
        walletConnectConnector.approveSession({ chainId: Number(connectedChainId), accounts: [shinkaWalletAddress] });
        console.log("session approved");
        const { peerMeta } = payload.params[0];
        setConnectedApp({ ...peerMeta });
        setIsWalletConnectConnecting(false);
        setIsWalletConnectSessionEstablished(true);
      });
      walletConnectConnector.on("call_request", async (error, payload) => {
        console.log("call_request", payload);
        if (error) {
          throw error;
        }
        if (payload.method === "eth_sendTransaction") {
          console.log("eth_sendTransaction");
          await processTx(
            shinkaWalletAddress,
            payload.params[0].to,
            payload.params[0].data,
            payload.params[0].value,
            payload.params[0].gas
          );
          walletConnectConnector.approveRequest({
            id: payload.id,
            result: transactionHash,
          });
        }
        if (payload.method === "personal_sign") {
          console.log("personal_sign");
          const message = convertHexToUtf8(payload.params[0]);
          console.log("signing message");
          const signature = await signer.signMessage(message);
          console.log("signature", signature);
          walletConnectConnector.approveRequest({
            id: payload.id,
            result: signature,
          });
        }
        if (payload.method === "eth_signTypedData") {
          console.log("eth_signTypedData");
          console.log("signing message");
          console.log(payload.params[1]);
          const { domain, message: value, types } = JSON.parse(payload.params[1]);
          delete types.EIP712Domain;
          console.log(domain, types, value);
          const signature = await signTypedData({ domain, types, value });
          console.log("signature", signature);
          walletConnectConnector.approveRequest({
            id: payload.id,
            result: signature,
          });
        }
      });
      walletConnectConnector.on("disconnect", (error, payload) => {
        console.log("disconnect", payload);
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

  const processTx = async (from: string, to: string, data: string, value: string, gasLimit?: string) => {
    if (!shinkaWalletAPI || !shinkaWalletAddress || !bundler || !compareInLowerCase(shinkaWalletAddress, from)) {
      return;
    }
    try {
      const op = await shinkaWalletAPI.createSignedUserOp({
        target: to,
        data,
        value,
        gasLimit, // let's add some extra gas
      });
      console.log("before", op);
      console.log("user op", op);
      const requestId = await bundler.sendUserOpToBundler(op);
      console.log("request sent", requestId);
      const transactionHash = await getTransactionHashByRequestID(requestId);
      console.log("transactionHash", transactionHash);
      setTransactionHash(transactionHash);
    } catch (e) {
      handleError(e);
    }
  };

  return (
    <Layout>
      <Stack spacing="8">
        {!isWalletConnected && (
          <Stack spacing="6">
            <VStack maxW="2xl" mx="auto" px={"4"} spacing="3">
              <Image src="/assets/hero.png" w="96" mx="auto" alt="logo" />
              <Text textAlign={"center"} fontSize={"lg"} fontWeight={"bold"} color={configJsonFile.style.color.accent}>
                {configJsonFile.description}
              </Text>
            </VStack>
            <VStack>
              <HStack spacing="2">
                <Button
                  fontWeight={"bold"}
                  variant="secondary"
                  onClick={() => window.open(`${configJsonFile.url.github}/blob/main/README.md`, "_blank")}
                >
                  Docs
                </Button>
                <Button fontWeight={"bold"} onClick={openConnectModal}>
                  Connect Wallet
                </Button>
              </HStack>
            </VStack>
          </Stack>
        )}
        {isWalletConnected && connectedChainId && connectedChainConfig && (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Unit header={"Wallet Connect"} position="relative">
              <Flex position="absolute" top="0" right="0" p="4">
                <Text fontSize="xs" fontWeight={"bold"}>
                  <Icon
                    as={AiOutlineQrcode}
                    aria-label="qrcode"
                    color={configJsonFile.style.color.link}
                    w={6}
                    h={6}
                    cursor="pointer"
                    onClick={qrReaderDisclosure.onOpen}
                  />
                </Text>
              </Flex>
              <Stack>
                <Stack spacing="0">
                  <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    Sample dApps
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                    <Link color={configJsonFile.style.color.link} href={configJsonFile.url.sample} target={"_blank"}>
                      WalletConnect Example
                    </Link>
                  </Text>
                </Stack>
                <Stack spacing="3.5">
                  <Stack spacing="0">
                    <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                      Connected Apps
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
                      placeholder={"Paste wc: uri"}
                      type={"text"}
                      value={walletConnectURI}
                      fontSize="xs"
                      onChange={(e) => setWalletConnectURI(e.target.value)}
                      disabled={isWalletConnectConnecting || isWalletConnectSessionEstablished}
                    />
                    <Button
                      onClick={() => connectWithWalletConnect(walletConnectURI)}
                      isLoading={isWalletConnectConnecting}
                      disabled={isWalletConnectSessionEstablished}
                    >
                      {!isWalletConnectSessionEstablished ? "Connect" : "Connected"}
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Unit>
          </SimpleGrid>
        )}
      </Stack>
      <Modal isOpen={qrReaderDisclosure.isOpen} onClose={qrReaderDisclosure.onClose} header="WalletConnect QR Scanner">
        <QrReader delay={500} onError={onQRReaderError} onScan={onQRReaderScan} />
      </Modal>
    </Layout>
  );
};

export default HomePage;
