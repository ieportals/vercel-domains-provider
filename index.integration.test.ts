import { describe, expect, it } from "vitest";
import { createVercelClient } from "./index";

const baseUrl = process.env.VERCEL_API_BASE ?? "https://api.vercel.com";
const bearerToken = process.env.VERCEL_BEARER_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;
const baseDomain = process.env.VERCEL_TEST_BASE_DOMAIN;

function getRequiredEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required integration env var: ${name}. Set it in .env.local or your shell before running tests.`
    );
  }
  return value;
}

describe("vercel live integration", () => {
  it("adds and removes a real subdomain", async () => {
    const requiredBearerToken = getRequiredEnv("VERCEL_BEARER_TOKEN", bearerToken);
    const requiredProjectId = getRequiredEnv("VERCEL_PROJECT_ID", projectId);
    const requiredBaseDomain = getRequiredEnv("VERCEL_TEST_BASE_DOMAIN", baseDomain);

    const client = createVercelClient({
      baseUrl,
      bearerToken: requiredBearerToken,
      projectId: requiredProjectId,
      baseDomain: requiredBaseDomain,
    });

    const subdomain = `vitest-${Date.now()}`;

    const addResult = await client.addSubdomain(subdomain);
    if (!addResult.success) {
      throw new Error(`Add failed: ${addResult.error ?? "Unknown error"}`);
    }

    const removeResult = await client.removeSubdomain(subdomain);
    if (!removeResult.success) {
      throw new Error(`Remove failed: ${removeResult.error ?? "Unknown error"}`);
    }

    expect(addResult.success).toBe(true);
    expect(removeResult.success).toBe(true);
  }, 30000);
});
