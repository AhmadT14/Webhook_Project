DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = 'jobs_subscribers'
	) THEN
		ALTER TABLE "jobs_subscribers" RENAME TO "delivery_attempts";
	END IF;
END $$;