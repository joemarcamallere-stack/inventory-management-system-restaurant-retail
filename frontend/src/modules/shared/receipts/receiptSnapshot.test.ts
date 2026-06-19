import { describe, expect, it } from 'vitest';
import { createReceiptSnapshot } from './index';

describe('createReceiptSnapshot', () => {
  it('creates a stable receipt payload for storage and reprint', () => {
    expect(createReceiptSnapshot({
      orderNumber: 'ORD-1',
      customerName: 'Juan Dela Cruz',
      paymentMethod: 'Cash',
      items: [
        { name: 'Denim Jacket', quantity: 1, unitPrice: 250, totalPrice: 250 },
      ],
      totals: {
        subtotal: 250,
        discount: 10,
        tax: 0,
        serviceCharge: 0,
        total: 240,
        amountPaid: 300,
        change: 60,
      },
    })).toEqual({
      receiptNumber: undefined,
      paymentNumber: undefined,
      transactionNumber: undefined,
      orderNumber: 'ORD-1',
      customerName: 'Juan Dela Cruz',
      paymentMethod: 'Cash',
      items: [
        { name: 'Denim Jacket', quantity: 1, unitPrice: 250, totalPrice: 250 },
      ],
      totals: {
        subtotal: 250,
        discount: 10,
        tax: 0,
        serviceCharge: 0,
        total: 240,
        amountPaid: 300,
        change: 60,
      },
    });
  });
});
