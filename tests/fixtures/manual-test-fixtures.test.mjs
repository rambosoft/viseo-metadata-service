import { afterEach, describe, expect, it } from "vitest";

import { loadFixtureConfig } from "../../scripts/manual-test-fixtures/fixture-config.mjs";
import {
  buildAuthSuccessPayload,
  buildFixtureInstructions,
} from "../../scripts/manual-test-fixtures/fixture-data.mjs";
import { startAuthFixtureServer } from "../../scripts/manual-test-fixtures/run-fixtures.mjs";

const runtimes = [];

afterEach(async () => {
  while (runtimes.length > 0) {
    await runtimes.pop().close();
  }
});

describe("manual test fixtures", () => {
  it("parses auth fixture config with sane defaults and mode normalization", () => {
    const config = loadFixtureConfig({
      MANUAL_FIXTURE_AUTH_PORT: "4510",
      MANUAL_FIXTURE_AUTH_MODE: "403",
      MANUAL_FIXTURE_SCOPES: "metadata:read,metadata:write",
      MANUAL_FIXTURE_EXPIRES_IN_SECONDS: "1800",
    });

    expect(config.authPort).toBe(4510);
    expect(config.authMode).toBe("403");
    expect(config.scopes).toEqual(["metadata:read", "metadata:write"]);
    expect(config.expiresInSeconds).toBe(1800);
  });

  it("returns success payload instructions and deterministic auth success payloads", () => {
    const config = loadFixtureConfig({
      MANUAL_FIXTURE_BIND_HOST: "127.0.0.1",
      MANUAL_FIXTURE_AUTH_PORT: "4010",
      MANUAL_FIXTURE_TOKEN: "demo-token",
      MANUAL_FIXTURE_TENANT_ID: "tenant_demo",
      MANUAL_FIXTURE_PRINCIPAL_ID: "principal_demo",
    });

    const payload = buildAuthSuccessPayload(config);
    const instructions = buildFixtureInstructions(config);

    expect(payload.principalId).toBe("principal_demo");
    expect(payload.tenantId).toBe("tenant_demo");
    expect(payload.scopes).toEqual(["metadata:read"]);
    expect(instructions.authUrl).toBe("http://127.0.0.1:4010/validate");
    expect(instructions.token).toBe("demo-token");
  });

  it("serves success, 401, and 403 auth responses from the live fixture server", async () => {
    const successRuntime = await startAuthFixtureServer({
      authPort: 4111,
      bindHost: "127.0.0.1",
      token: "demo-token",
      authMode: "success",
      tenantId: "tenant_demo",
      principalId: "principal_demo",
      scopes: ["metadata:read"],
      expiresInSeconds: 3600,
    });
    runtimes.push(successRuntime);

    const successResponse = await fetch("http://127.0.0.1:4111/validate", {
      method: "POST",
      headers: {
        authorization: "Bearer demo-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ token: "demo-token" }),
    });
    expect(successResponse.status).toBe(200);
    expect((await successResponse.json()).tenantId).toBe("tenant_demo");

    const unauthorizedRuntime = await startAuthFixtureServer({
      authPort: 4112,
      bindHost: "127.0.0.1",
      token: "demo-token",
      authMode: "401",
      tenantId: "tenant_demo",
      principalId: "principal_demo",
      scopes: ["metadata:read"],
      expiresInSeconds: 3600,
    });
    runtimes.push(unauthorizedRuntime);
    const unauthorizedResponse = await fetch("http://127.0.0.1:4112/validate", {
      method: "POST",
    });
    expect(unauthorizedResponse.status).toBe(401);

    const forbiddenRuntime = await startAuthFixtureServer({
      authPort: 4113,
      bindHost: "127.0.0.1",
      token: "demo-token",
      authMode: "403",
      tenantId: "tenant_demo",
      principalId: "principal_demo",
      scopes: ["metadata:read"],
      expiresInSeconds: 3600,
    });
    runtimes.push(forbiddenRuntime);
    const forbiddenResponse = await fetch("http://127.0.0.1:4113/validate", {
      method: "POST",
    });
    expect(forbiddenResponse.status).toBe(403);
  });
});
