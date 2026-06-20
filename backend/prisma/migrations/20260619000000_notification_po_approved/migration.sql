-- Add PURCHASE_ORDER_APPROVED to the NotificationType enum (additive, non-destructive).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'PURCHASE_ORDER_APPROVED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'PURCHASE_ORDER_APPROVED';
  END IF;
END $$;
