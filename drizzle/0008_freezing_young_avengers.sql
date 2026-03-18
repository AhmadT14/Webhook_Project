ALTER TABLE "delivery_attempts" RENAME COLUMN "attempt_No" TO "attempt_no";--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "payload" SET DATA TYPE jsonb;