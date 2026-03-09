import { db } from "../index.js";
import { jobsTable } from "../schema.js";

export async function createJob(data: { pipeline_id: string; payload: string }) {
  const [result] = await db.insert(jobsTable).values(data);
  return result;
}
