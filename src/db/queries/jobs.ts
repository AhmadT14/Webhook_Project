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
    .where(eq(jobsTable.status, "queued"))
    .orderBy(jobsTable.last_retry);
  return result;
}

export async function changeStatus(status: string, jobId: string) {
  await db
    .update(jobsTable)
    .set({ status: status })
    .where(eq(jobsTable.id, jobId));
}

export async function sent(jobId: string) {
  await db
    .update(jobsTable)
    .set({ attempts: sql`${jobsTable.attempts} + 1`, sent_at: sql`NOW()` })
    .where(eq(jobsTable.id, jobId));
}

export async function retry(jobId: string) {
  await db
    .update(jobsTable)
    .set({ attempts: sql`${jobsTable.attempts} + 1`, last_retry: sql`NOW()` })
    .where(eq(jobsTable.id, jobId));
}

export async function returnAttemptsount(jobId: string) {
  const [result] = await db
    .select({
      attempts: jobsTable.attempts,
    })
    .from(jobsTable)
    .where(eq(jobsTable.id, jobId));
  return result;
}
