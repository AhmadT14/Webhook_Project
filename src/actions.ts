import { randomUUID } from "node:crypto";

export type ActionsResultPayload = Record<string, unknown>;
export const Actions = ["uppercase", "add_event_id", "redact"];

function uppercaseUnknown(value: unknown): unknown {
  if (typeof value === "string") {
    return value.toUpperCase();
  }
  if (Array.isArray(value)) {
    return value.map((item) => uppercaseUnknown(item));
  }
  if (typeof value === "object" && value !== null) {
    return uppercaseValues(value as Record<string, unknown>);
  }
  return value;
}

function uppercaseValues(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = uppercaseUnknown(value);
  }
  return result;
}

export async function uppercase(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return uppercaseValues(payload);
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
