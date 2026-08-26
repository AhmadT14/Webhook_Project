import { db } from "../index.js";
import { deliveryAttemptsTable, jobsTable } from "../schema.js";
import { and, eq, lte, sql } from "drizzle-orm";

const MAX_JOB_ATTEMPTS = 5;
const BACKOFF_SECONDS = [30, 120, 600, 1800, 3600];

export async function createJob(data: {
  pipeline_id: string;
  subscriber_id: string;
  payload: Record<string, unknown>;
}) {
  const [result] = await db.insert(jobsTable).values(data).returning();
  return result;
}

export async function createJobsForSubscribers(
  jobs: {
    pipeline_id: string;
    subscriber_id: string;
    payload: Record<string, unknown>;
  }[],
) {
  if (jobs.length === 0) {
    return [];
  }
  return db.insert(jobsTable).values(jobs).returning();
}

export async function claimNextJob() {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.status, "queued"),
          lte(jobsTable.next_attempt_at, sql`now()`),
        ),
      )
      .orderBy(jobsTable.next_attempt_at)
      .limit(1)
      .for("update", { skipLocked: true });

    if (!job) {
      return undefined;
    }

    const [claimed] = await tx
      .update(jobsTable)
      .set({ status: "processing", locked_at: sql`now()` })
      .where(eq(jobsTable.id, job.id))
      .returning();

    return claimed;
  });
}

export async function getJobs() {
  const result = await db.select().from(jobsTable);
  return result;
}

export async function getJobsById(jobId: string) {
  const [result] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, jobId));
  return result;
}

export async function jobFailed(jobId: string) {
  await db
    .update(jobsTable)
    .set({ status: "failed", locked_at: null })
    .where(eq(jobsTable.id, jobId))
    .returning();
}

export async function jobSent(
  processed_payload: Record<string, unknown>,
  jobId: string,
) {
  const [result] = await db
    .update(jobsTable)
    .set({
      attempts: sql`${jobsTable.attempts} + 1`,
      completed_at: sql`now()`,
      status: "completed",
      locked_at: null,
    })
    .where(eq(jobsTable.id, jobId))
    .returning();

  if (!result) {
    return;
  }

  await db.insert(deliveryAttemptsTable).values({
    job_id: jobId,
    attempt_no: result.attempts,
    processed_payload: processed_payload,
    attempt_status: "sent",
  });
}

export async function jobRetry(
  processed_payload: Record<string, unknown>,
  jobId: string,
) {
  const current = await jobAttemptsCount(jobId);
  if (!current) {
    return;
  }

  const nextAttemptNumber = current.attempts + 1;

  if (nextAttemptNumber >= MAX_JOB_ATTEMPTS) {
    await jobFailed(jobId);
    await db.insert(deliveryAttemptsTable).values({
      job_id: jobId,
      attempt_no: nextAttemptNumber,
      processed_payload: processed_payload,
      attempt_status: "failed",
    });
    return;
  }

  const delaySeconds =
    BACKOFF_SECONDS[current.attempts] ??
    BACKOFF_SECONDS[BACKOFF_SECONDS.length - 1];

  const [result] = await db
    .update(jobsTable)
    .set({
      attempts: sql`${jobsTable.attempts} + 1`,
      last_retry: sql`now()`,
      next_attempt_at: sql`now() + (${delaySeconds} || ' seconds')::interval`,
      status: "queued",
      locked_at: null,
    })
    .where(eq(jobsTable.id, jobId))
    .returning();

  if (!result) {
    return;
  }

  await db.insert(deliveryAttemptsTable).values({
    job_id: jobId,
    attempt_no: result.attempts,
    processed_payload: processed_payload,
    attempt_status: "failed",
  });
}

export async function jobAttemptsCount(jobId: string) {
  const [result] = await db
    .select({
      attempts: jobsTable.attempts,
    })
    .from(jobsTable)
    .where(eq(jobsTable.id, jobId));
  return result;
}

export async function requeueFailedJob(jobId: string) {
  const [result] = await db
    .update(jobsTable)
    .set({
      status: "queued",
      next_attempt_at: sql`now()`,
      locked_at: null,
    })
    .where(and(eq(jobsTable.id, jobId), eq(jobsTable.status, "failed")))
    .returning();

  return result;
}