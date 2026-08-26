import {
  pgTable,
  text,
  uuid,
  integer,
  jsonb,
  unique,
  index,
  timestamp,
} from "drizzle-orm/pg-core";

export const pipelinesTable = pgTable("pipelines", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  action: text("action").notNull(),
  created_at: timestamp().notNull().defaultNow(),
  signing_secret: text("signing_secret").notNull(),
});

export const jobsTable = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subscriber_id: uuid("subscriber_id").references(() => subscribersTable.id, {
      onDelete: "set null",
    }),
    pipeline_id: uuid("pipeline_id").references(() => pipelinesTable.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").default(0).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    created_at: timestamp().notNull().defaultNow(),
    last_retry: timestamp().notNull().defaultNow(),
    next_attempt_at: timestamp().notNull().defaultNow(),
    locked_at: timestamp(),
    completed_at: timestamp(),
  },
  (table) => [
    index("idx_jobs_status_next_attempt").on(
      table.status,
      table.next_attempt_at,
    ),
  ],
);

export const subscribersTable = pgTable(
  "subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),
    name: text("name").notNull(),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
    pipeline_id: uuid("pipeline_id")
      .notNull()
      .references(() => pipelinesTable.id, {
        onDelete: "cascade",
      }),
    signing_secret: text("signing_secret").notNull(),
  },
  (table) => [unique().on(table.pipeline_id, table.url)],
);

export const deliveryAttemptsTable = pgTable("delivery_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  job_id: uuid("job_id")
    .references(() => jobsTable.id)
    .notNull(),
  attempt_no: integer("attempt_no").default(0).notNull(),
  attempt_status: text("attempt_status").notNull().default("failed"),
  added_at: timestamp().notNull().defaultNow(),
  processed_payload:
    jsonb("processed_payload").$type<Record<string, unknown>>(),
  attempt_at: timestamp().notNull().defaultNow(),
});

