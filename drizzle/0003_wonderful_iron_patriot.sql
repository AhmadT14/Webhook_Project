CREATE TABLE "jobs_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"subscriber_id" uuid,
	"attempt_No" integer DEFAULT 0,
	"subscriber_attempt_status" text DEFAULT 'failed' NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs_subscribers" ADD CONSTRAINT "jobs_subscribers_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs_subscribers" ADD CONSTRAINT "jobs_subscribers_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_url_unique" UNIQUE("url");--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_name_unique" UNIQUE("name");