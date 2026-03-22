import http from "node:http";
import { pathToFileURL } from "node:url";

import { loadFixtureConfig } from "./fixture-config.mjs";
import {
  buildAuthSuccessPayload,
  buildFixtureInstructions,
} from "./fixture-data.mjs";

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString("utf8");
  if (body.length === 0) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

export function createAuthFixtureServer(config) {
  return http.createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health/live") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok", mode: config.authMode }));
      return;
    }

    if (request.method !== "POST" || request.url !== "/validate") {
      response.writeHead(404);
      response.end();
      return;
    }

    if (config.authMode === "401") {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    if (config.authMode === "403") {
      response.writeHead(403, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "forbidden" }));
      return;
    }

    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;
    const body = await readJsonBody(request);
    const bodyToken = body !== null && typeof body.token === "string" ? body.token : undefined;

    if (token !== config.token || bodyToken !== config.token) {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(buildAuthSuccessPayload(config)));
  });
}

export async function startAuthFixtureServer(config) {
  const server = createAuthFixtureServer(config);
  await new Promise((resolve) => {
    server.listen(config.authPort, config.bindHost, resolve);
  });

  return {
    server,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error !== undefined) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

function printInstructions(config) {
  const details = buildFixtureInstructions(config);
  console.log("");
  console.log("Manual auth fixture is running.");
  console.log(`Bind host:    ${config.bindHost}`);
  console.log(`Mode:         ${details.mode}`);
  console.log(`Auth URL:     ${details.authUrl}`);
  console.log(`Health URL:   ${details.healthUrl}`);
  console.log(`Bearer token: ${details.token}`);
  console.log(`Tenant ID:    ${details.tenantId}`);
  console.log(`Principal ID: ${details.principalId}`);
  console.log(`Scopes:       ${details.scopes.join(",")}`);
  console.log("");
  console.log("Suggested local runtime overrides:");
  console.log(`  AUTH_SERVICE_URL=${details.authUrl.replace("/validate", "")}`);
  console.log(`  REDIS_URL=redis://localhost:6379`);
  console.log("  TMDB_API_KEY=<your-real-token>");
  console.log("");
  console.log("Press Ctrl+C to stop the fixture server.");
}

async function main() {
  const config = loadFixtureConfig();
  const runtime = await startAuthFixtureServer(config);
  printInstructions(config);

  const shutdown = async () => {
    await runtime.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
