import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";

export const pipelinesTable = pgTable("pipelines", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  actions: text("actions").notNull(),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
});
