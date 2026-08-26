import { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { UnAuthorized } from "../errors.js";

export function APIKeyValidation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const key = req.get("X-API-Key");
  const expected = process.env.ADMIN_API_KEY;

  if (!key || !expected) {
    throw new UnAuthorized("Key is Incorrect");
  }

  const keyBuffer = Buffer.from(key);
  const expectedBuffer = Buffer.from(expected);

  if (
    keyBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(keyBuffer, expectedBuffer)
  ) {
    throw new UnAuthorized("Key is Incorrect");
  }

  next();
}