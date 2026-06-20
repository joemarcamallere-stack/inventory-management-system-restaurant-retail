-- Soft-delete flag for inventory items (retire discontinued items without breaking
-- FK references from recipes, sales, POs, etc.). Defaults to active for existing rows.
ALTER TABLE "InventoryItem"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "InventoryItem_businessId_isActive_idx"
  ON "InventoryItem" ("businessId", "isActive");
