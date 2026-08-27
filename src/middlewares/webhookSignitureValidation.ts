import crypto from "node:crypto";
import "dotenv/config";

export function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(
  payload: string,
  receivedSignature: string,
  secret: string,
): boolean {
  const expectedSignature = generateSignature(payload, secret);

  const received = Buffer.from(receivedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, expected);
}
