import { afterEach, describe, expect, it, vi } from "vitest";
import { createVercelClient } from "./index";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createVercelClient", () => {
  it("adds a subdomain and returns domain on success", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ name: "staging.example.com", verified: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = createVercelClient({
      baseUrl: "https://api.vercel.com",
      bearerToken: "token",
      projectId: "project_123",
      baseDomain: "example.com",
    });

    const result = await client.addSubdomain("staging");

    expect(result).toEqual({ success: true, domain: "staging.example.com" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vercel.com/v10/projects/project_123/domains",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "staging.example.com" }),
      }
    );
  });

  it("maps domain_already_in_use to a friendly error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "domain_already_in_use" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = createVercelClient({
      baseUrl: "https://api.vercel.com",
      bearerToken: "token",
      projectId: "project_123",
      baseDomain: "example.com",
    });

    const result = await client.addCustomDomain("already-in-use.com");

    expect(result).toEqual({
      success: false,
      domain: "already-in-use.com",
      error: "This domain is already in use by another Vercel project",
    });
  });

  it("treats custom domain delete 404 as success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "not_found" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = createVercelClient({
      baseUrl: "https://api.vercel.com",
      bearerToken: "token",
      projectId: "project_123",
      baseDomain: "example.com",
    });

    const result = await client.removeCustomDomain("missing.com");

    expect(result).toEqual({ success: true });
  });

  it("returns config error when required client values are missing", async () => {
    const client = createVercelClient({
      baseUrl: "https://api.vercel.com",
      bearerToken: "",
      projectId: "",
      baseDomain: "",
    });

    const result = await client.addSubdomain("staging");

    expect(result.success).toBe(false);
    expect(result.error).toContain("missing baseDomain, projectId, bearerToken");
  });
});
