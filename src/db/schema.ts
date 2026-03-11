import { pgTable, text, uuid, integer } from "drizzle-orm/pg-core";
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
  status: text("status").notNull().default("queued"),
  created_at: timestamp().notNull().defaultNow(),
  last_retry: timestamp().notNull().defaultNow(),
  attempts: integer("attempts").default(0),
  pipeline_id: uuid("pipeline_id").references(() => pipelinesTable.id),
});

export const subscribersTable = pgTable("subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  created_at: timestamp().notNull().defaultNow(),
  pipeline_id: uuid("pipeline_id").references(() => pipelinesTable.id),
});
