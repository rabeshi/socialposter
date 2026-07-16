import { describe, it, expect } from "vitest";
import { assertCronAuthorized, UnauthorizedError } from "@/lib/security";

function makeRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/cron/generate-content", { headers });
}

describe("assertCronAuthorized", () => {
  it("accepts a request with the correct bearer secret", () => {
    expect(() => assertCronAuthorized(makeRequest({ authorization: `Bearer ${process.env.CRON_SECRET}` }))).not.toThrow();
  });

  it("rejects a request with no authorization header", () => {
    expect(() => assertCronAuthorized(makeRequest({}))).toThrow(UnauthorizedError);
  });

  it("rejects a request with the wrong secret", () => {
    expect(() => assertCronAuthorized(makeRequest({ authorization: "Bearer wrong-secret" }))).toThrow(UnauthorizedError);
  });

  it("rejects a malformed authorization header", () => {
    expect(() => assertCronAuthorized(makeRequest({ authorization: process.env.CRON_SECRET! }))).toThrow(UnauthorizedError);
  });
});
