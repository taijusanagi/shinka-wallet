import { Button, HStack, IconButton, Input, Link, Stack, Text } from "@chakra-ui/react";
import { ethers } from "ethers";
import { NextPage } from "next";
import { useEffect } from "react";
import { AiOutlineQrcode } from "react-icons/ai";

import {
  AccountAbstractionTxStepModal,
  useAccountAbstractionTxStepModal,
} from "@/components/AccountAbstractionTxStepModal";
import { Layout } from "@/components/Layout";
import { QRCodeScannerModal, useQRCodeScannerModal } from "@/components/QRCodeScannerModal";
import { Unit } from "@/components/Unit";
import { useConnected } from "@/hooks/useConnected";
import { useErrorToast } from "@/hooks/useErrorToast";
import { useShinkaWallet } from "@/hooks/useShinkaWallet";
import { useStripe } from "@/hooks/useStripe";
import { useWalletConnect } from "@/hooks/useWalletConnect";

import configJsonFile from "../../config.json";

const HomePage: NextPage = () => {
  const { connected } = useConnected();
  const { shinkaWallet } = useShinkaWallet();
  const stripe = useStripe();
  const { instance, id, setId, ...walletConnect } = useWalletConnect();
  const qrCodeScannerModal = useQRCodeScannerModal();
  const { start, hash, ...accountAbstractionTxStepModal } = useAccountAbstractionTxStepModal();

  const errorToast = useErrorToast();

  useEffect(() => {
    if (walletConnect.tx) {
      start(walletConnect.tx);
      walletConnect.setTx(undefined);
    }
  }, [start, walletConnect]);

  useEffect(() => {
    if (instance && id && hash) {
      instance.approveRequest({ id, result: hash });
      setId(undefined);
    }
  }, [instance, id, setId, hash]);

  return (
    <Layout>
      {connected && shinkaWallet && (
        <Stack spacing="4">
          <Unit header="Payment Portal" position="relative">
            <Stack spacing="2">
              <Stack spacing="1">
                <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  Account Abstraction Wallet
                </Text>
                <Text fontSize="xs" color={configJsonFile.style.color.link}>
                  <Link
                    href={`${connected.networkConfig.explorer.url}/address/${shinkaWallet.address}`}
                    target={"_blank"}
                  >
                    {shinkaWallet.address}
                  </Link>
                </Text>
              </Stack>
              <Stack spacing="1">
                <Stack spacing="1">
                  <Text fontSize="xs" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    ETH
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                    <Text as="span" mr="1">
                      {shinkaWallet.ethFormatedBalance}
                    </Text>
                    <Text as="span">ETH</Text>
                  </Text>
                </Stack>
                <Stack spacing="1">
                  <Text fontSize="xs" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    Credit Card
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                    <Text as="span" mr="1">
                      {shinkaWallet.creditFormatedBalance}
                    </Text>
                    <Text as="span">ETH</Text>
                  </Text>
                </Stack>
                <Stack spacing="1">
                  <Text fontSize="xs" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    Gas Token
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                    <Text as="span" mr="1">
                      {shinkaWallet.paymentTokenFormatedBalance}
                    </Text>
                    <Text as="span">USD</Text>
                  </Text>
                </Stack>
              </Stack>
              <Stack spacing="3">
                <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  Deposit with
                </Text>
                <HStack spacing="2">
                  <Button
                    w="full"
                    fontSize={"xs"}
                    size="sm"
                    onClick={async () => {
                      try {
                        await connected.signer.sendTransaction({
                          to: shinkaWallet.address,
                          value: ethers.utils.parseEther("0.1"),
                        });
                      } catch (e) {
                        errorToast.open(e);
                      }
                    }}
                  >
                    ETH
                  </Button>
                  <Button
                    w="full"
                    fontSize={"xs"}
                    size="sm"
                    isLoading={stripe.isProcessingCheckout}
                    onClick={stripe.checkout}
                  >
                    Credit Card
                  </Button>
                  <Button
                    w="full"
                    fontSize={"xs"}
                    size="sm"
                    onClick={async () => {
                      try {
                        await connected.paymentToken.mint(shinkaWallet.address);
                      } catch (e) {
                        errorToast.open(e);
                      }
                    }}
                  >
                    Gas Token
                  </Button>
                </HStack>
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
                  disabled={!!walletConnect.isConnected}
                  onClick={qrCodeScannerModal.onOpen}
                />
              </Text>
            </HStack>
            <Stack>
              <Stack spacing="3.5">
                <Stack spacing="0">
                  {!walletConnect.app && (
                    <Text fontSize="xs" fontWeight={"medium"} color={configJsonFile.style.color.black.text.secondary}>
                      Not Connected
                    </Text>
                  )}
                  {walletConnect.app && (
                    <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                      Connected with{" "}
                      <Link
                        color={configJsonFile.style.color.link}
                        href={walletConnect.app.url}
                        target={"_blank"}
                        fontWeight={"bold"}
                      >
                        {walletConnect.app.name}
                      </Link>
                    </Text>
                  )}
                </Stack>
                <Stack>
                  <Input
                    placeholder={"wc:"}
                    type={"text"}
                    value={walletConnect.uri}
                    fontSize="xs"
                    onChange={(e) => walletConnect.setURI(e.target.value)}
                  />
                  <Button
                    variant={!walletConnect.isConnected ? "primary" : "secondary"}
                    onClick={
                      !walletConnect.isConnected ? () => walletConnect.connect() : () => walletConnect.disconnect()
                    }
                    isLoading={walletConnect.isConnecting}
                  >
                    {!walletConnect.isConnected ? "Connect" : "Disconnect"}
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </Unit>
        </Stack>
      )}
      <QRCodeScannerModal
        isOpen={qrCodeScannerModal.isOpen}
        onScan={walletConnect.setURI}
        onClose={qrCodeScannerModal.onClose}
      />
      <AccountAbstractionTxStepModal
        mode={accountAbstractionTxStepModal.mode}
        choosePaymentMethod={accountAbstractionTxStepModal.choosePaymentMethod}
        currentStep={accountAbstractionTxStepModal.currentStep}
        isProcessing={accountAbstractionTxStepModal.isProcessing}
        isOpen={accountAbstractionTxStepModal.isOpen}
        onClose={accountAbstractionTxStepModal.clear}
        tx={accountAbstractionTxStepModal.accountAbstractionTx}
        hash={hash}
      />
    </Layout>
  );
};

export default HomePage;
