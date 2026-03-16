import { db } from "../index.js";
import { jobsTable } from "../schema.js";
import { eq, sql } from "drizzle-orm";

export async function createJob(data: {
  pipeline_id: string;
  payload: string;
}) {
  const [result] = await db.insert(jobsTable).values(data);
  return result;
}

export async function returnQueuedjob() {
  const [result] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.job_status, "queued"))
    .orderBy(jobsTable.last_retry);
  return result;
}

export async function getJobs() {
  const result = await db.select().from(jobsTable);
  return result;
}

export async function getJobsById(jobId: string) {
  const result = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, jobId));
  return result;
}

export async function changeJobStatus(status: string, jobId: string) {
  await db
    .update(jobsTable)
    .set({ job_status: status })
    .where(eq(jobsTable.id, jobId));
}

export async function jobSent(jobId: string) {
  await db
    .update(jobsTable)
    .set({ attempts: sql`${jobsTable.attempts} + 1`, sent_at: sql`NOW()` })
    .where(eq(jobsTable.id, jobId));
}

export async function jobRetry(jobId: string) {
  await db
    .update(jobsTable)
    .set({ attempts: sql`${jobsTable.attempts} + 1`, last_retry: sql`NOW()` })
    .where(eq(jobsTable.id, jobId));
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
