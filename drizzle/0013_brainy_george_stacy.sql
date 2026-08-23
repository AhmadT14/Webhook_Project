ALTER TABLE "delivery_attempts" DROP CONSTRAINT "delivery_attempts_subscriber_id_subscribers_id_fk";
--> statement-breakpoint
ALTER TABLE "delivery_attempts" ALTER COLUMN "processed_payload" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD COLUMN "attempt_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "subscriber_id" uuid;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "action" text NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_attempts" DROP COLUMN "subscriber_id";--> statement-breakpoint
ALTER TABLE "pipelines" DROP COLUMN "action";