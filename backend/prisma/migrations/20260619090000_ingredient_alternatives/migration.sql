CREATE TABLE "IngredientAlternative" (
  "id" TEXT NOT NULL,
  "parentIngredientId" TEXT NOT NULL,
  "alternativeIngredientId" TEXT NOT NULL,
  "additionalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "businessId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IngredientAlternative_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IngredientAlternative_businessId_parentIngredientId_alternativeIngredientId_key" ON "IngredientAlternative"("businessId", "parentIngredientId", "alternativeIngredientId");
CREATE INDEX "IngredientAlternative_businessId_idx" ON "IngredientAlternative"("businessId");
CREATE INDEX "IngredientAlternative_parentIngredientId_idx" ON "IngredientAlternative"("parentIngredientId");
CREATE INDEX "IngredientAlternative_alternativeIngredientId_idx" ON "IngredientAlternative"("alternativeIngredientId");

ALTER TABLE "IngredientAlternative" ADD CONSTRAINT "IngredientAlternative_parentIngredientId_fkey" FOREIGN KEY ("parentIngredientId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngredientAlternative" ADD CONSTRAINT "IngredientAlternative_alternativeIngredientId_fkey" FOREIGN KEY ("alternativeIngredientId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngredientAlternative" ADD CONSTRAINT "IngredientAlternative_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
