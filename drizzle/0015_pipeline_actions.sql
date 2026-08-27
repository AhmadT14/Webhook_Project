ALTER TABLE "pipelines" ADD COLUMN "actions" text[];--> statement-breakpoint
UPDATE "pipelines" SET "actions" = ARRAY["action"]::text[];--> statement-breakpoint
ALTER TABLE "pipelines" ALTER COLUMN "actions" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pipelines" DROP COLUMN "action";
