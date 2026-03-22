import { randomUUID } from "node:crypto";

export type ActionsResultPayload = Record<string, unknown>;
export const Actions = ["convertDatesToISO", "add_event_id", "redact"];

function convertDatesToISOUnknown(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => convertDatesToISOUnknown(item));
  }
  if (typeof value === "object" && value !== null) {
    return convertDatesToISOValues(value as Record<string, unknown>);
  }
  if (typeof value === "string" && !isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return value;
}

function convertDatesToISOValues(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = convertDatesToISOUnknown(value);
  }
  return result;
}

export async function convertDatesToISO(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return convertDatesToISOValues(payload);
}

export async function addEventId(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return {
    ...payload,
    event_id: randomUUID(),
  };
}

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "key",
  "authorization",
  "auth",
];

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      result[key] = "[REDACTED]";
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      result[key] = redactObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function redact(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return redactObject(payload);
}
