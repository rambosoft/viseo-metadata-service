const parsePort = (value, fallback) => {
  const parsed = Number.parseInt(value ?? `${fallback}`, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? `${fallback}`, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

const parseScopes = (value) => {
  const scopes = (value ?? "metadata:read")
    .split(",")
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);
  return scopes.length > 0 ? scopes : ["metadata:read"];
};

const normalizeMode = (value) => {
  if (value === "401" || value === "403" || value === "success") {
    return value;
  }
  return "success";
};

export function loadFixtureConfig(env = process.env) {
  return {
    authPort: parsePort(env.MANUAL_FIXTURE_AUTH_PORT, 4010),
    bindHost: env.MANUAL_FIXTURE_BIND_HOST ?? "127.0.0.1",
    token: env.MANUAL_FIXTURE_TOKEN ?? "demo-token",
    authMode: normalizeMode(env.MANUAL_FIXTURE_AUTH_MODE),
    tenantId: env.MANUAL_FIXTURE_TENANT_ID ?? "tenant_demo",
    principalId: env.MANUAL_FIXTURE_PRINCIPAL_ID ?? "principal_demo",
    scopes: parseScopes(env.MANUAL_FIXTURE_SCOPES),
    expiresInSeconds: parsePositiveInteger(env.MANUAL_FIXTURE_EXPIRES_IN_SECONDS, 3600),
  };
}
