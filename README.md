# PDF Genius

This pnpm monorepo contains the web application, API server and Expo mobile app.

## Replicate image tools

The API server uses Replicate's official Node.js SDK for Aura SR v2 upscaling
and background removal. Aura produces WebP output at 4×; the existing 2× option
resizes that AI-generated result. Results use the application's authenticated
download flow and 24-hour storage retention rather than temporary provider URLs.

For Railway, set **`REPLICATE_API_TOKEN` in Railway → Service → Variables**.
Use an active Replicate API token; never commit or log it. Replit Secrets and
attached Replit integrations do not automatically configure Railway variables.
Missing tokens produce an explicit startup warning, and unconfigured AI tools
return a readable error without preventing other tools from starting.

The SDK is a runtime dependency of `@workspace/api-server` only. Its package
manifest and the root `pnpm-lock.yaml` must be included in the same Git commit.

```sh
pnpm install --frozen-lockfile
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/pdf-convert-master build
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

Railway supplies `PORT` at runtime. These commands match `railpack.json`, which
builds the web app and API, then starts the API's `dist/index.mjs`. The API serves
both on one origin. The external SDK remains installed in `node_modules` at runtime.

On Replit only, the SDK transport can use an attached Replicate integration when
the direct token is missing or explicitly rejected with HTTP 401. It does not
retry prediction creation through another credential after timeouts or server errors.
