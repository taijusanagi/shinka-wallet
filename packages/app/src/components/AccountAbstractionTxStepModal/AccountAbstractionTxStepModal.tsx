import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";

import { Modal } from "@/components/Modal";
import { Step } from "@/components/Step";
import { useConnected } from "@/hooks/useConnected";
import { useShinkaWallet } from "@/hooks/useShinkaWallet";
import { Tx } from "@/types/Tx";

import configJsonFile from "../../../config.json";
import { steps } from "./steps";
import { AccountAbstractionTxStepModalMode, PaymentMethod } from "./types";

export interface AccountAbstractionTxStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: AccountAbstractionTxStepModalMode;
  choosePaymentMethod: (paymentMethod: PaymentMethod) => void;
  currentStep: number;
  isProcessing: boolean;
  tx?: Tx;
  hash?: string;
}

export const AccountAbstractionTxStepModal: React.FC<AccountAbstractionTxStepModalProps> = ({
  isOpen,
  onClose,
  mode,
  choosePaymentMethod,
  currentStep,
  isProcessing,
  tx,
  hash,
}) => {
  const { connected } = useConnected();
  const { shinkaWallet } = useShinkaWallet();
  return (
    <Modal header={"Send Account Abstraction Tx"} isOpen={isOpen} onClose={onClose}>
      {connected && shinkaWallet && tx && (
        <Stack>
          {mode === "choosePaymentMethod" && (
            <Stack spacing="4">
              <Stack spacing="2">
                <Stack spacing="1">
                  <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    To
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                    {tx.target}
                  </Text>
                </Stack>
                <Stack spacing="1">
                  <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    Data
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                    {tx.data}
                  </Text>
                </Stack>
                <Stack spacing="1">
                  <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    Value
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                    {tx.value.toString()} {connected.networkConfig.currency}
                  </Text>
                </Stack>
                <Stack spacing="1">
                  <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    GasLimit
                  </Text>
                  <Text fontSize="xs" color={configJsonFile.style.color.black.text.secondary}>
                    {tx.gasLimit.toString()}
                  </Text>
                </Stack>
              </Stack>
              <Stack spacing="3">
                <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  Pay with
                </Text>
                <HStack spacing="2">
                  <Button
                    w="full"
                    fontSize={"xs"}
                    size="sm"
                    disabled={shinkaWallet.ethBalanceBigNumber.eq(0)}
                    onClick={() => {
                      choosePaymentMethod("eth");
                    }}
                  >
                    ETH
                  </Button>
                  <Button
                    w="full"
                    fontSize={"xs"}
                    size="sm"
                    disabled={shinkaWallet.creditBalanceBigNumber.eq(0)}
                    onClick={() => {
                      choosePaymentMethod("creditCard");
                    }}
                  >
                    Credit Card
                  </Button>
                  <Button
                    w="full"
                    fontSize={"xs"}
                    size="sm"
                    disabled={shinkaWallet.paymentTokenBalanceBigNumber.eq(0)}
                    onClick={() => {
                      choosePaymentMethod("paymentToken");
                    }}
                  >
                    Gas Token
                  </Button>
                </HStack>
              </Stack>
            </Stack>
          )}
          {mode === "processTx" && (
            <Stack spacing={"6"}>
              <Box>
                {steps.map((step, id) => (
                  <Step
                    key={id}
                    title={step.title}
                    description={step.description}
                    isActive={currentStep === id}
                    isCompleted={currentStep > id}
                    isProcessing={isProcessing}
                    isLastStep={steps.length === id + 1}
                  />
                ))}
              </Box>
              {hash && (
                <Button onClick={() => window.open(`${connected.networkConfig.explorer.url}/tx/${hash}`, "_blank")}>
                  View Tx Status
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </Modal>
  );
};
