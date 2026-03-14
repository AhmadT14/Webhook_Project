import { db } from "../index.js";
import { eq, sql } from "drizzle-orm";
import { jobsSubscribersTable, jobsTable } from "../schema.js";

export async function getFullDeliveryAttempty() {
  const result = await db.select().from(jobsSubscribersTable);
  return result;
}

export async function getDeliveryAttemptysByJobId(id: string) {
  const result = await db
    .select()
    .from(jobsSubscribersTable)
    .where(eq(jobsSubscribersTable.job_id, id));
  return result;
}

export async function getJobStatusById(jobId: string) {
  const result = await db
    .select({ jobId: jobsTable.id, job_status: jobsTable.job_status })
    .from(jobsTable)
    .where(eq(jobsTable.id, jobId));
  return result;
}

export async function getJobStatus() {
  const result = await db
    .select({ jobId: jobsTable.id, job_status: jobsTable.job_status })
    .from(jobsTable);
  return result;
}

export async function addToHistory(data: {
  job_id: string;
  subscriber_id: string;
  subscriber_attempt_status?: string;
  attemptNo:number
}) {
  const result = await db.insert(jobsSubscribersTable).values(data);
  return result;
}
