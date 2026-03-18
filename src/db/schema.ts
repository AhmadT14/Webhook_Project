import { pgTable, text, uuid, integer, jsonb } from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";

export const pipelinesTable = pgTable("pipelines", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  action: text("action").notNull(),
  created_at: timestamp().notNull().defaultNow(),
});

export const jobsTable = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  job_status: text("status").notNull().default("queued"),
  created_at: timestamp().notNull().defaultNow(),
  last_retry: timestamp().notNull().defaultNow(),
  completed_at: timestamp(),
  attempts: integer("attempts").default(0).notNull(),
  pipeline_id: uuid("pipeline_id").references(() => pipelinesTable.id, {
    onDelete: "set null",
  }),
});

export const subscribersTable = pgTable("subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull().unique(),
  name: text("name").notNull().unique(),
  created_at: timestamp().notNull().defaultNow(),
  pipeline_id: uuid("pipeline_id").references(() => pipelinesTable.id, {
    onDelete: "cascade",
  }),
});

export const deliveryAttemptsTable = pgTable("delivery_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  job_id: uuid("job_id")
    .references(() => jobsTable.id)
    .notNull(),
  subscriber_id: uuid("subscriber_id").references(() => subscribersTable.id, {
    onDelete: "set null",
  }),
  attempt_no: integer("attempt_no").default(0).notNull(),
  attempt_status: text("attempt_status").notNull().default("failed"),
  added_at: timestamp().notNull().defaultNow(),
  processed_payload: jsonb("processed_payload")
    .$type<Record<string, unknown>>()
    .notNull(),
});
