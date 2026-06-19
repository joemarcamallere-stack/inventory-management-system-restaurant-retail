import { PrintableReceipt, type ReceiptSnapshot } from '../../../shared/receipts';

type Props = {
  receipt: ReceiptSnapshot;
  issuedAt?: string;
};

export function RetailThermalReceipt({ receipt, issuedAt }: Props) {
  return <PrintableReceipt receipt={receipt} issuedAt={issuedAt} />;
}
