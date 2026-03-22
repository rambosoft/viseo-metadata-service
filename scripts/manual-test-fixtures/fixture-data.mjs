export function buildAuthSuccessPayload(config) {
  return {
    principalId: config.principalId,
    tenantId: config.tenantId,
    scopes: config.scopes,
    expiresAt: new Date(Date.now() + config.expiresInSeconds * 1000).toISOString(),
  };
}

export function buildFixtureInstructions(config) {
  return {
    authUrl: `http://${config.bindHost}:${config.authPort}/validate`,
    healthUrl: `http://${config.bindHost}:${config.authPort}/health/live`,
    token: config.token,
    mode: config.authMode,
    tenantId: config.tenantId,
    principalId: config.principalId,
    scopes: config.scopes,
  };
}
