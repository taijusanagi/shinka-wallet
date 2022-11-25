import { Button, HStack, Stack, Text } from "@chakra-ui/react";

import { Modal } from "@/components/Modal";
import { useConnected } from "@/hooks/useConnected";
import { useShinkaWallet } from "@/hooks/useShinkaWallet";
import { Tx } from "@/types/Tx";

import configJsonFile from "../../../config.json";
import { AccountAbstractionTxStepModalMode } from "./useAccountAbstractionTxStepModal";

export interface AccountAbstractionTxStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: AccountAbstractionTxStepModalMode;
  currentStep: number;
  isProcessing: boolean;
  tx?: Tx;
  hash?: string;
}

export const AccountAbstractionTxStepModal: React.FC<AccountAbstractionTxStepModalProps> = ({
  isOpen,
  onClose,
  mode,
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
                  <Button w="full" fontSize={"xs"} size="sm" disabled={shinkaWallet.creditBalanceBigNumber.eq(0)}>
                    ETH
                  </Button>
                  <Button w="full" fontSize={"xs"} size="sm" disabled={shinkaWallet.creditBalanceBigNumber.eq(0)}>
                    Gas Token
                  </Button>
                  <Button w="full" fontSize={"xs"} size="sm" disabled={shinkaWallet.creditBalanceBigNumber.eq(0)}>
                    Credit Card
                  </Button>
                </HStack>
              </Stack>
            </Stack>
          )}
        </Stack>
      )}
    </Modal>
  );
};
