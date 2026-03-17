ALTER TABLE "pipelines" RENAME COLUMN "actions" TO "action";--> statement-breakpoint
ALTER TABLE "delivery_attempts" DROP CONSTRAINT IF EXISTS "delivery_attempts_subscriber_id_subscribers_id_fk";
--> statement-breakpoint
ALTER TABLE "delivery_attempts" DROP CONSTRAINT IF EXISTS "jobs_subscribers_subscriber_id_subscribers_id_fk";
--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_pipeline_id_pipelines_id_fk";
--> statement-breakpoint
ALTER TABLE "subscribers" DROP CONSTRAINT IF EXISTS "subscribers_pipeline_id_pipelines_id_fk";
--> statement-breakpoint
ALTER TABLE "delivery_attempts" ALTER COLUMN "subscriber_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "pipeline_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;