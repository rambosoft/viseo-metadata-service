import {
  DataExchangeClient,
  SendApiAssetCommand,
} from "@aws-sdk/client-dataexchange";

const tmdbBaseUrl = process.env.TMDB_BASE_URL ?? "https://api.themoviedb.org/3";
const tmdbApiKey = requireEnv("TMDB_API_KEY");
const imdbApiUrl = process.env.IMDB_API_URL ?? "https://api-fulfill.dataexchange.us-east-1.amazonaws.com/v1";
const imdbApiKey = requireEnv("IMDB_API_KEY");
const imdbRegion = process.env.IMDB_AWS_REGION ?? "us-east-1";
const imdbDataSetId = requireEnv("IMDB_DATA_SET_ID");
const imdbRevisionId = requireEnv("IMDB_REVISION_ID");
const imdbAssetId = requireEnv("IMDB_ASSET_ID");
const movieImdbId = process.env.SMOKE_MOVIE_IMDB_ID ?? "tt0137523";
const tvImdbId = process.env.SMOKE_TV_IMDB_ID ?? "tt0903747";

async function main() {
  const tmdbMovie = await fetchJson(
    `${tmdbBaseUrl}/movie/${encodeURIComponent(process.env.SMOKE_MOVIE_TMDB_ID ?? "550")}?api_key=${encodeURIComponent(tmdbApiKey)}`,
  );
  const tmdbTv = await fetchJson(
    `${tmdbBaseUrl}/tv/${encodeURIComponent(process.env.SMOKE_TV_TMDB_ID ?? "1396")}?api_key=${encodeURIComponent(tmdbApiKey)}`,
  );

  const imdbClient = new DataExchangeClient({ region: imdbRegion });
  const imdbMovie = await lookupImdbTitle(imdbClient, movieImdbId);
  const imdbTv = await lookupImdbTitle(imdbClient, tvImdbId);

  console.log("");
  console.log("Provider smoke checks passed:");
  console.log(`- TMDB movie title: ${tmdbMovie.title ?? tmdbMovie.name}`);
  console.log(`- TMDB TV title: ${tmdbTv.name ?? tmdbTv.title}`);
  console.log(`- IMDb movie title: ${imdbMovie.title?.titleText?.text ?? movieImdbId}`);
  console.log(`- IMDb TV title: ${imdbTv.title?.titleText?.text ?? tvImdbId}`);
}

async function lookupImdbTitle(client, imdbId) {
  const endpoint = new URL(imdbApiUrl);
  const response = await client.send(
    new SendApiAssetCommand({
      AssetId: imdbAssetId,
      DataSetId: imdbDataSetId,
      RevisionId: imdbRevisionId,
      Method: "POST",
      Path: endpoint.pathname.length > 0 ? endpoint.pathname : "/v1",
      QueryStringParameters:
        endpoint.search.length > 1 ? Object.fromEntries(endpoint.searchParams.entries()) : undefined,
      RequestHeaders: {
        "accept": "application/json",
        "content-type": "application/json",
        "x-api-key": imdbApiKey,
      },
      Body: JSON.stringify({
        query: `
          query LookupTitle($id: ID!) {
            title(id: $id) {
              id
              titleText {
                text
              }
              titleType {
                text
                canHaveEpisodes
              }
              ratingsSummary {
                aggregateRating
              }
            }
          }
        `,
        variables: { id: imdbId },
      }),
    }),
  );

  const payload = JSON.parse(await readBodyAsString(response.Body));
  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? "IMDb API error");
  }
  return payload.data;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }
  return response.json();
}

async function readBodyAsString(body) {
  if (body && typeof body.transformToString === "function") {
    return body.transformToString();
  }
  if (body && Symbol.asyncIterator in body) {
    let output = "";
    for await (const chunk of body) {
      output += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    }
    return output;
  }
  if (typeof body === "string") {
    return body;
  }
  throw new Error("Unable to read IMDb response body");
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
