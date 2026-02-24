# vercel-dns-provider

A tiny TypeScript helper for adding/removing Vercel project domains and reading domain config.

## Environment variables

An example env file is included at `.env.example`.

Runtime keys:

- `VERCEL_API_BASE`
- `VERCEL_BEARER_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_BASE_DOMAIN`

Optional test keys:

- `VERCEL_TEST_BASE_DOMAIN`

## Usage

```ts
import { createVercelClient } from "@ieportals/vercel-dns-provider";

const dns = createVercelClient({
  baseUrl: process.env.VERCEL_API_BASE || "https://api.vercel.com",
  bearerToken: process.env.VERCEL_BEARER_TOKEN || "",
  projectId: process.env.VERCEL_PROJECT_ID || "",
  baseDomain: process.env.VERCEL_BASE_DOMAIN || "example.com",
});

const addResult = await dns.addSubdomain("staging");

if (!addResult.success) {
  console.error("Add failed:", addResult.error);
}

const removeResult = await dns.removeSubdomain("staging");

if (!removeResult.success) {
  console.error("Remove failed:", removeResult.error);
}
```

## API

### `createVercelClient(config)`

Creates a client with shared config and returns methods:

- `addSubdomain(subdomain: string)`
- `removeSubdomain(subdomain: string)`
- `addCustomDomain(domain: string)`
- `removeCustomDomain(domain: string)`
- `getDomainConfig(domain: string)`

Config fields:

- `baseUrl` - Vercel API base URL
- `bearerToken` - Vercel bearer token
- `projectId` - Vercel project id
- `baseDomain` - Base domain for generated subdomains (for example `example.com`)

## Testing

Run tests:

```bash
pnpm test
```

Vitest loads `.env` and `.env.local` automatically for tests.

Integration tests always run. If required env vars are missing, tests fail with a clear error.

- `VERCEL_BEARER_TOKEN` is set
- `VERCEL_PROJECT_ID` is set
- `VERCEL_TEST_BASE_DOMAIN` is set
