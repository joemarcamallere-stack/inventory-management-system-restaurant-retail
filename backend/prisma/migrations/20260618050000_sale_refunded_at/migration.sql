ALTER TABLE "Sale" ADD COLUMN "refundedAt" TIMESTAMP(3);

UPDATE "Sale" AS s
SET "refundedAt" = COALESCE(
  (
    SELECT MIN(sm."createdAt")
    FROM "StockMovement" AS sm
    WHERE sm."businessId" = s."businessId"
      AND sm."referenceType" = 'SALE'
      AND sm."referenceId" = s."id"
      AND sm."type" = 'VOID_RESTOCK'
  ),
  s."updatedAt"
)
WHERE s."status" = 'REFUNDED'
  AND s."refundedAt" IS NULL;

CREATE INDEX "Sale_businessId_refundedAt_idx" ON "Sale"("businessId", "refundedAt");
