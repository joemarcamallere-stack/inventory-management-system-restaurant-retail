ALTER TABLE "StockAdjustment"
ADD COLUMN IF NOT EXISTS "module" "BusinessModule" NOT NULL DEFAULT 'RETAIL';

CREATE INDEX IF NOT EXISTS "StockAdjustment_businessId_module_status_idx"
ON "StockAdjustment"("businessId", "module", "status");
