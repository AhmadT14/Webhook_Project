import { db } from "../index.js";
import { deliveryAttemptsTable, jobsTable } from "../schema.js";
import { eq, sql } from "drizzle-orm";

const MAX_JOB_ATTEMPTS = 5;

export async function createJob(data: {
  pipeline_id: string;
  payload: Record<string, unknown>;
}) {
  const [result] = await db.insert(jobsTable).values(data).returning();
  return result;
}

export async function returnQueuedjob() {
  const [result] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.status, "queued"))
    .orderBy(jobsTable.last_retry);
  return result;
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
    .set({ status: "failed" })
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
      completed_at: sql`NOW()`,
      status: "completed",
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
  const attempts = await jobAttemptsCount(jobId);
  if (!attempts || attempts.attempts === MAX_JOB_ATTEMPTS) {
    await jobFailed(jobId);
    return;
  }
  const [result] = await db
    .update(jobsTable)
    .set({
      attempts: sql`${jobsTable.attempts} + 1`,
      last_retry: sql`NOW()`,
      status: "queued",
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
