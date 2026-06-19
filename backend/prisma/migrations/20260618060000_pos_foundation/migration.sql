CREATE TYPE "POSOrderType" AS ENUM ('DINE_IN', 'TAKEOUT', 'MIXED', 'RETAIL');
CREATE TYPE "POSOrderStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED', 'VOIDED');
CREATE TYPE "POSPaymentStatus" AS ENUM ('NOT_PAID', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOIDED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOIDED');

CREATE TABLE "BusinessSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "businessId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "POSSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "module" "BusinessModule" NOT NULL,
  "businessId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "POSSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "POSOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "orderType" "POSOrderType" NOT NULL DEFAULT 'RETAIL',
  "status" "POSOrderStatus" NOT NULL DEFAULT 'PENDING',
  "paymentStatus" "POSPaymentStatus" NOT NULL DEFAULT 'NOT_PAID',
  "customerName" TEXT,
  "contactNumber" TEXT,
  "tableName" TEXT,
  "partySize" INTEGER,
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountType" TEXT,
  "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "serviceCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "voidReason" TEXT,
  "voidedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "locationId" TEXT NOT NULL,
  "tableId" TEXT,
  "saleId" TEXT,
  "businessId" TEXT NOT NULL,
  "module" "BusinessModule" NOT NULL DEFAULT 'RETAIL',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "POSOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "POSOrderItem" (
  "id" TEXT NOT NULL,
  "posOrderId" TEXT NOT NULL,
  "inventoryItemId" TEXT,
  "recipeId" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "itemType" TEXT,
  "notes" TEXT,
  "customizations" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "POSOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "paymentNumber" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "amountDue" DOUBLE PRECISION NOT NULL,
  "amountPaid" DOUBLE PRECISION NOT NULL,
  "change" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
  "saleId" TEXT,
  "posOrderId" TEXT,
  "businessId" TEXT NOT NULL,
  "processedById" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Receipt" (
  "id" TEXT NOT NULL,
  "receiptNumber" TEXT NOT NULL,
  "receiptData" JSONB NOT NULL,
  "printedAt" TIMESTAMP(3),
  "saleId" TEXT,
  "posOrderId" TEXT,
  "paymentId" TEXT,
  "businessId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessSetting_businessId_key_key" ON "BusinessSetting"("businessId", "key");
CREATE INDEX "BusinessSetting_businessId_idx" ON "BusinessSetting"("businessId");

CREATE UNIQUE INDEX "POSSetting_businessId_module_key_key" ON "POSSetting"("businessId", "module", "key");
CREATE INDEX "POSSetting_businessId_idx" ON "POSSetting"("businessId");
CREATE INDEX "POSSetting_businessId_module_idx" ON "POSSetting"("businessId", "module");

CREATE UNIQUE INDEX "POSOrder_businessId_orderNumber_key" ON "POSOrder"("businessId", "orderNumber");
CREATE UNIQUE INDEX "POSOrder_saleId_key" ON "POSOrder"("saleId");
CREATE INDEX "POSOrder_businessId_module_status_idx" ON "POSOrder"("businessId", "module", "status");
CREATE INDEX "POSOrder_businessId_paymentStatus_idx" ON "POSOrder"("businessId", "paymentStatus");
CREATE INDEX "POSOrder_businessId_createdAt_idx" ON "POSOrder"("businessId", "createdAt");
CREATE INDEX "POSOrder_businessId_locationId_idx" ON "POSOrder"("businessId", "locationId");
CREATE INDEX "POSOrder_tableId_idx" ON "POSOrder"("tableId");
CREATE INDEX "POSOrder_saleId_idx" ON "POSOrder"("saleId");

CREATE INDEX "POSOrderItem_posOrderId_idx" ON "POSOrderItem"("posOrderId");
CREATE INDEX "POSOrderItem_inventoryItemId_idx" ON "POSOrderItem"("inventoryItemId");
CREATE INDEX "POSOrderItem_recipeId_idx" ON "POSOrderItem"("recipeId");

CREATE UNIQUE INDEX "Payment_businessId_paymentNumber_key" ON "Payment"("businessId", "paymentNumber");
CREATE INDEX "Payment_businessId_paidAt_idx" ON "Payment"("businessId", "paidAt");
CREATE INDEX "Payment_businessId_method_idx" ON "Payment"("businessId", "method");
CREATE INDEX "Payment_saleId_idx" ON "Payment"("saleId");
CREATE INDEX "Payment_posOrderId_idx" ON "Payment"("posOrderId");

CREATE UNIQUE INDEX "Receipt_businessId_receiptNumber_key" ON "Receipt"("businessId", "receiptNumber");
CREATE INDEX "Receipt_businessId_createdAt_idx" ON "Receipt"("businessId", "createdAt");
CREATE INDEX "Receipt_saleId_idx" ON "Receipt"("saleId");
CREATE INDEX "Receipt_posOrderId_idx" ON "Receipt"("posOrderId");
CREATE INDEX "Receipt_paymentId_idx" ON "Receipt"("paymentId");

ALTER TABLE "KitchenOrder" ADD COLUMN "posOrderId" TEXT;
CREATE INDEX "KitchenOrder_posOrderId_idx" ON "KitchenOrder"("posOrderId");

ALTER TABLE "BusinessSetting" ADD CONSTRAINT "BusinessSetting_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "POSSetting" ADD CONSTRAINT "POSSetting_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "POSOrder" ADD CONSTRAINT "POSOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "POSOrder" ADD CONSTRAINT "POSOrder_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DiningTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "POSOrder" ADD CONSTRAINT "POSOrder_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "POSOrder" ADD CONSTRAINT "POSOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "POSOrder" ADD CONSTRAINT "POSOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "POSOrderItem" ADD CONSTRAINT "POSOrderItem_posOrderId_fkey" FOREIGN KEY ("posOrderId") REFERENCES "POSOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "POSOrderItem" ADD CONSTRAINT "POSOrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "POSOrderItem" ADD CONSTRAINT "POSOrderItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_posOrderId_fkey" FOREIGN KEY ("posOrderId") REFERENCES "POSOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_posOrderId_fkey" FOREIGN KEY ("posOrderId") REFERENCES "POSOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KitchenOrder" ADD CONSTRAINT "KitchenOrder_posOrderId_fkey" FOREIGN KEY ("posOrderId") REFERENCES "POSOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
