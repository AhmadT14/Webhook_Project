import { Request, Response } from "express";
import "dotenv/config";
import { createJob } from "../db/queries/jobs.js";

export const webhookUrlPath = "/webhook/:pipelineId";

export async function webhookHandler(req: Request, res: Response){
  try {
    const id=req.params.pipelineId[0];
    const data=req.body;
    const job=await createJob({pipeline_id:id,payload:JSON.stringify(data)})
    if(!job)
    {
      throw new Error()
    }
    res.status(200).send(job);
  } catch (err) {
    console.log(err);
  }
}
