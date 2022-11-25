import { Box, Button, Stack, Text } from "@chakra-ui/react";

import { Modal } from "@/components/Modal";
import { Step } from "@/components/Step";
import { useConnected } from "@/hooks/useConnected";
import { Tx } from "@/types/Tx";

import configJsonFile from "../../../config.json";
import { steps } from "./steps";

export interface AccountAbstractionTxStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
  isProcessing: boolean;
  tx?: Tx;
  hash?: string;
}

export const AccountAbstractionTxStepModal: React.FC<AccountAbstractionTxStepModalProps> = ({
  isOpen,
  onClose,
  currentStep,
  isProcessing,
  tx,
  hash,
}) => {
  const { connected } = useConnected();
  return (
    <Modal header={"Send Account Abstraction Tx"} isOpen={isOpen} onClose={onClose}>
      <Stack spacing="8">
        <Stack spacing="4">
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
          {connected && tx && (
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
                  {tx.target}
                </Text>
              </Stack>
              <Stack spacing="1">
                <Text fontSize="x-small" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  Data
                </Text>
                <Text fontSize="xx-small" color={configJsonFile.style.color.black.text.secondary}>
                  {tx.data}
                </Text>
              </Stack>
              <Stack spacing="1">
                <Text fontSize="x-small" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  Value
                </Text>
                <Text fontSize="xx-small" color={configJsonFile.style.color.black.text.secondary}>
                  {tx.value.toString()} {connected.networkConfig.currency}
                </Text>
              </Stack>
              <Stack spacing="1">
                <Text fontSize="x-small" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                  GasLimit
                </Text>
                <Text fontSize="xx-small" color={configJsonFile.style.color.black.text.secondary}>
                  {tx.gasLimit.toString()}
                </Text>
              </Stack>
            </Stack>
          )}
          {connected && hash && (
            <Button onClick={() => window.open(`${connected.networkConfig.explorer.url}/tx/${hash}`, "_blank")}>
              View Tx Status
            </Button>
          )}
        </Stack>
      </Stack>
    </Modal>
  );
};
