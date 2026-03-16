import { NextFunction, Request, Response } from "express";
import { UnAuthorized } from "./errors";

export function APIKeyValidation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const key = req.get("X-API-Key");
  if (!key || key !== process.env.ADMIN_API_KEY) {
    throw new UnAuthorized("Key is Incorrect");
  }
  next();
}
