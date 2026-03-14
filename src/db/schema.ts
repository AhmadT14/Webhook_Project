import { pgTable, text, uuid, integer, primaryKey } from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";

export const pipelinesTable = pgTable("pipelines", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  actions: text("actions").notNull(),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
});

export const jobsTable = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  payload: text("payload").notNull(),
  job_status: text("status").notNull().default("queued"),
  created_at: timestamp().notNull().defaultNow(),
  last_retry: timestamp().notNull().defaultNow(),
  sent_at: timestamp(),
  attempts: integer("attempts").default(0),
  pipeline_id: uuid("pipeline_id").references(() => pipelinesTable.id),
});

export const subscribersTable = pgTable("subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull().unique(),
  name: text("name").notNull().unique(),
  created_at: timestamp().notNull().defaultNow(),
  pipeline_id: uuid("pipeline_id").references(() => pipelinesTable.id),
});

export const jobsSubscribersTable = pgTable(
  "jobs_subscribers",
  {
    job_id: uuid("job_id").references(() => jobsTable.id),
    subscriber_id: uuid("job_id").references(() => subscribersTable.id),
    attempt_No: integer("attempt_No").default(0),
    subscriber_attempt_status: text("subscriber_attempt_status")
      .notNull()
      .default("failed"),
    added_at: timestamp().notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.job_id, table.subscriber_id] })],
);
