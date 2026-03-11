import { db } from "../index.js";
import { eq } from "drizzle-orm";
import { pipelinesTable, subscribersTable } from "../schema.js";

export async function getSubscribersUrlsByPipelineId(pipelineId: string) {
  const result = await db
    .select({
      url: subscribersTable.url,
    })
    .from(subscribersTable)
    .where(eq(pipelinesTable.id, pipelineId));
  return result;
}
