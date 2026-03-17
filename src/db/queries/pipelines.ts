import { db } from "../index.js";
import { eq } from "drizzle-orm";
import { pipelinesTable } from "../schema.js";

export async function getAllPipelines() {
  const result = await db.select().from(pipelinesTable);
  return result;
}

export async function getPipelineById(id: string) {
  const [result] = await db
    .select()
    .from(pipelinesTable)
    .where(eq(pipelinesTable.id, id));
  return result;
}

export async function createPipeline(data: { name: string; action: string }) {
  const [result] = await db.insert(pipelinesTable).values(data).returning();
  return result;
}

export async function deletePipelineById(id: string) {
  const result = await db
    .delete(pipelinesTable)
    .where(eq(pipelinesTable.id, id));
  return result;
}

export async function updatePipelineById(
  id: string,
  data: Partial<{ name: string; action: string }>,
) {
  const [result] = await db
    .update(pipelinesTable)
    .set(data)
    .where(eq(pipelinesTable.id, id))
    .returning();
  return result;
}
