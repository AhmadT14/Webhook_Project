DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'delivery_attempts'
			AND column_name = 'attempt_No'
	)
	AND NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'delivery_attempts'
			AND column_name = 'attempt_no'
	) THEN
		ALTER TABLE "delivery_attempts" RENAME COLUMN "attempt_No" TO "attempt_no";
	END IF;
END $$;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'delivery_attempts'
			AND column_name = 'attempt_no'
	) THEN
		ALTER TABLE "delivery_attempts" ALTER COLUMN "attempt_no" SET NOT NULL;
	END IF;
END $$;
