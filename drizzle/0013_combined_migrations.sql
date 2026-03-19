DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'delivery_attempts'
      AND column_name = 'subscriber_attempt_status'
  ) THEN
    ALTER TABLE "delivery_attempts" RENAME COLUMN "subscriber_attempt_status" TO "attempt_status";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'sent_at'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE "jobs" RENAME COLUMN "sent_at" TO "completed_at";
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE "jobs" ADD COLUMN "completed_at" timestamp;
  END IF;
END $$;
