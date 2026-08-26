CREATE TABLE "webhook_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscribers" DROP CONSTRAINT "subscribers_url_unique";--> statement-breakpoint
ALTER TABLE "subscribers" DROP CONSTRAINT "subscribers_name_unique";--> statement-breakpoint
ALTER TABLE "subscribers" ALTER COLUMN "pipeline_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "next_attempt_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "locked_at" timestamp;--> statement-breakpoint
ALTER TABLE "pipelines" ADD COLUMN "action" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pipelines" ADD COLUMN "signing_secret" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pipelines" ADD COLUMN "rate_limit_per_min" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "signing_secret" text NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_requests" ADD CONSTRAINT "webhook_requests_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_webhook_requests_pipeline_time" ON "webhook_requests" USING btree ("pipeline_id","requested_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_status_next_attempt" ON "jobs" USING btree ("status","next_attempt_at");--> statement-breakpoint
ALTER TABLE "subscribers" DROP COLUMN "action";--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_pipeline_id_url_unique" UNIQUE("pipeline_id","url");