import { Modal } from "@/components/Modal";
import { useErrorHandler } from "@/hooks/useErrorHandler";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const QrReader = require("react-qr-scanner");

export interface useQRCodeScanner {
  isOpen: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

export interface ScanResult {
  text: string;
}

export const QRCodeScanner: React.FC<useQRCodeScanner> = ({ isOpen, onClose, onScan }) => {
  const { handleError } = useErrorHandler();

  return (
    <Modal isOpen={isOpen} onClose={onClose} header="WalletConnect QR Scanner">
      <QrReader
        facingMode="front"
        delay={500}
        onScan={(result: ScanResult | undefined) => {
          if (!result) {
            return;
          }
          onScan(result.text);
          onClose();
        }}
        onError={(err: unknown) => {
          handleError(err);
        }}
      />
    </Modal>
  );
};
