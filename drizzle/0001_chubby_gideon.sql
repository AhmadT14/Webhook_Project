CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_retry" timestamp DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0,
	"piupeline_id" uuid
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_piupeline_id_pipelines_id_fk" FOREIGN KEY ("piupeline_id") REFERENCES "public"."pipelines"("id") ON DELETE no action ON UPDATE no action;