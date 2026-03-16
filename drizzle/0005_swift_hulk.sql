ALTER TABLE "delivery_attempts" ALTER COLUMN "job_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ALTER COLUMN "subscriber_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ALTER COLUMN "attempt_No" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "attempts" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "pipeline_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pipelines" DROP COLUMN "updated_at";