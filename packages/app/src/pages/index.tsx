import { Button, HStack, IconButton, Input, Link, Stack, Text, useDisclosure } from "@chakra-ui/react";
import { ethers } from "ethers";
import { NextPage } from "next";
import { useEffect } from "react";
import { AiOutlineQrcode } from "react-icons/ai";

import { AccountAbstractionTxStepModal } from "@/components/AccountAbstractionTxStepModal";
import { useAccountAbstractionTxStepModal } from "@/components/AccountAbstractionTxStepModal/useAccountAbstractionTxStepModal";
import { Layout } from "@/components/Layout";
import { QRCodeScannerModal } from "@/components/QRCodeScannerModal/QRCodeScannerModal";
import { useQRCodeScannerModal } from "@/components/QRCodeScannerModal/useQRCodeScannerModal";
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
  const walletConnect = useWalletConnect();
  const qrCodeScannerModal = useQRCodeScannerModal();
  const { handle, ...accountAbstractionTxStepModal } = useAccountAbstractionTxStepModal();

  const errorToast = useErrorToast();

  useEffect(() => {
    if (walletConnect.tx) {
      handle(walletConnect.tx);
      walletConnect.setTx(undefined);
    }
  }, [handle, walletConnect]);

  return (
    <Layout>
      {connected && shinkaWallet && (
        <Stack>
          <Unit header="Wallet Manager" position="relative">
            <Stack spacing="2">
              <Stack spacing="1">
                <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  Address
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
                <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  Balance
                </Text>
                <HStack>
                  <Text fontSize="xs" fontWeight={"medium"} color={configJsonFile.style.color.black.text.secondary}>
                    ETH:
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                    <Text as="span" mr="1">
                      {shinkaWallet.ethFormatedBalance}
                    </Text>
                    <Text as="span">ETH</Text>
                  </Text>
                </HStack>
                <HStack>
                  <Text fontSize="xs" fontWeight={"medium"} color={configJsonFile.style.color.black.text.secondary}>
                    Payment Token:
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                    <Text as="span" mr="1">
                      {shinkaWallet.paymentTokenFormatedBalance}
                    </Text>
                    <Text as="span">USD</Text>
                  </Text>
                </HStack>
                <HStack>
                  <Text fontSize="xs" fontWeight={"medium"} color={configJsonFile.style.color.black.text.secondary}>
                    Credit:
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                    <Text as="span" mr="1">
                      {shinkaWallet.creditFormatedBalance}
                    </Text>
                    <Text as="span">ETH</Text>
                  </Text>
                </HStack>
              </Stack>
              <Stack spacing="2">
                <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  Deposit with
                </Text>
                <HStack spacing="2">
                  <Button
                    w="full"
                    fontSize={"xs"}
                    size="sm"
                    variant="secondary"
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
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await connected.paymentToken.mint(shinkaWallet.address);
                      } catch (e) {
                        errorToast.open(e);
                      }
                    }}
                  >
                    Payment Token
                  </Button>
                  <Button
                    w="full"
                    fontSize={"xs"}
                    size="sm"
                    variant="secondary"
                    isLoading={stripe.isProcessingCheckout}
                    onClick={stripe.checkout}
                  >
                    Credit Card
                  </Button>
                </HStack>
              </Stack>
            </Stack>
          </Unit>
          <Unit header={"Connect with dApps"} position="relative">
            <HStack position="absolute" top="0" right="0" p="4">
              {!walletConnect.isConnected && (
                <Text fontSize="xs" color={configJsonFile.style.color.link} fontWeight="bold">
                  <Link href={"https://example.walletconnect.org"} target={"_blank"}>
                    Example dApp
                  </Link>
                </Text>
              )}
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
                      <Link color={configJsonFile.style.color.link} href={walletConnect.app.url} target={"_blank"}>
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
        currentStep={accountAbstractionTxStepModal.currentStep}
        isProcessing={accountAbstractionTxStepModal.isProcessing}
        isOpen={accountAbstractionTxStepModal.isOpen}
        onClose={accountAbstractionTxStepModal.onClose}
        tx={accountAbstractionTxStepModal.accountAbstractionTx}
      />
    </Layout>
  );
};

export default HomePage;
