const apiBaseUrl = process.env.SMOKE_API_BASE_URL ?? "http://127.0.0.1:3000";
const token = process.env.SMOKE_AUTH_TOKEN ?? "demo-token";

async function main() {
  const checks = [];

  checks.push(await expectJson(`${apiBaseUrl}/health/live`, 200, "liveness"));
  checks.push(await expectJson(`${apiBaseUrl}/health/ready`, 200, "readiness"));
  checks.push(await expectText(`${apiBaseUrl}/metrics`, 200, "metrics", "http_requests_total"));
  checks.push(await expectJson(`${apiBaseUrl}/openapi.json`, 200, "openapi"));
  checks.push(await expectText(`${apiBaseUrl}/docs`, 200, "docs", "SwaggerUIBundle"));

  checks.push(
    await expectJson(
      `${apiBaseUrl}/api/v1/media/movie?tmdbId=${encodeURIComponent(process.env.SMOKE_MOVIE_TMDB_ID ?? "550")}`,
      200,
      "movie lookup by tmdbId",
      { Authorization: `Bearer ${token}` },
    ),
  );
  checks.push(
    await expectJson(
      `${apiBaseUrl}/api/v1/media/movie?imdbId=${encodeURIComponent(process.env.SMOKE_MOVIE_IMDB_ID ?? "tt0137523")}`,
      200,
      "movie lookup by imdbId",
      { Authorization: `Bearer ${token}` },
    ),
  );
  checks.push(
    await expectJson(
      `${apiBaseUrl}/api/v1/media/tv?tmdbId=${encodeURIComponent(process.env.SMOKE_TV_TMDB_ID ?? "1396")}`,
      200,
      "tv lookup by tmdbId",
      { Authorization: `Bearer ${token}` },
    ),
  );
  checks.push(
    await expectJson(
      `${apiBaseUrl}/api/v1/media/tv?imdbId=${encodeURIComponent(process.env.SMOKE_TV_IMDB_ID ?? "tt0903747")}`,
      200,
      "tv lookup by imdbId",
      { Authorization: `Bearer ${token}` },
    ),
  );
  checks.push(
    await expectJson(
      `${apiBaseUrl}/api/v1/media/search?q=${encodeURIComponent("fight club")}`,
      200,
      "search",
      { Authorization: `Bearer ${token}` },
    ),
  );

  if (process.env.SMOKE_IMDB_FALLBACK_MOVIE_ID) {
    checks.push(
      await expectJson(
        `${apiBaseUrl}/api/v1/media/movie?imdbId=${encodeURIComponent(process.env.SMOKE_IMDB_FALLBACK_MOVIE_ID)}`,
        200,
        "movie lookup by imdbId fallback",
        { Authorization: `Bearer ${token}` },
      ),
    );
  }

  if (process.env.SMOKE_IMDB_FALLBACK_TV_ID) {
    checks.push(
      await expectJson(
        `${apiBaseUrl}/api/v1/media/tv?imdbId=${encodeURIComponent(process.env.SMOKE_IMDB_FALLBACK_TV_ID)}`,
        200,
        "tv lookup by imdbId fallback",
        { Authorization: `Bearer ${token}` },
      ),
    );
  }

  console.log("");
  console.log("Compose smoke checks passed:");
  for (const check of checks) {
    console.log(`- ${check}`);
  }
}

async function expectJson(url, expectedStatus, label, headers = {}) {
  const response = await fetch(url, { headers });
  if (response.status !== expectedStatus) {
    throw new Error(`${label} failed with ${response.status}`);
  }
  await response.json();
  return `${label}: ${expectedStatus}`;
}

async function expectText(url, expectedStatus, label, includes, headers = {}) {
  const response = await fetch(url, { headers });
  if (response.status !== expectedStatus) {
    throw new Error(`${label} failed with ${response.status}`);
  }
  const body = await response.text();
  if (!body.includes(includes)) {
    throw new Error(`${label} did not include expected marker: ${includes}`);
  }
  return `${label}: ${expectedStatus}`;
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
