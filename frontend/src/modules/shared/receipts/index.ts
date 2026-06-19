export type ReceiptLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type ReceiptTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  total: number;
  amountPaid: number;
  change: number;
};

export type ReceiptSnapshot = {
  receiptNumber?: string;
  paymentNumber?: string;
  transactionNumber?: string;
  orderNumber?: string;
  customerName?: string;
  paymentMethod: string;
  items: ReceiptLineItem[];
  totals: ReceiptTotals;
};

export function createReceiptSnapshot(input: {
  receiptNumber?: string;
  paymentNumber?: string;
  transactionNumber?: string;
  orderNumber?: string;
  customerName?: string;
  paymentMethod: string;
  items: ReceiptLineItem[];
  totals: ReceiptTotals;
}): ReceiptSnapshot {
  return {
    receiptNumber: input.receiptNumber,
    paymentNumber: input.paymentNumber,
    transactionNumber: input.transactionNumber,
    orderNumber: input.orderNumber,
    customerName: input.customerName,
    paymentMethod: input.paymentMethod,
    items: input.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    totals: {
      subtotal: input.totals.subtotal,
      discount: input.totals.discount,
      tax: input.totals.tax,
      serviceCharge: input.totals.serviceCharge,
      total: input.totals.total,
      amountPaid: input.totals.amountPaid,
      change: input.totals.change,
    },
  };
}

export { PrintableReceipt } from './PrintableReceipt';
