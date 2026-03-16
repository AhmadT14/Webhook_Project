import { BadRequestError, NotFoundError, UnAuthorized } from "./errors.js";
import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _: Request,
  res: Response,
  __: NextFunction,
) {
  let statusCode = 500;
  let message = "Something went wrong on our end";

  if (err instanceof BadRequestError) {
    statusCode = 400;
    message = err.message;
  } else if (err instanceof NotFoundError) {
    statusCode = 404;
    message = err.message;
  } else if (err instanceof UnAuthorized) {
    statusCode = 401;
    message = err.message;
  }
  if (statusCode >= 500) {
    console.log(err.message);
  }
  respondWithError(res, statusCode, message);
}

export function respondWithError(res: Response, code: number, message: string) {
  respondWithJSON(res, code, { error: message });
}

export function respondWithJSON(res: Response, code: number, payload: unknown) {
  res.header("Content-Type", "application/json");
  const body = JSON.stringify(payload);
  res.status(code).send(body);
}
