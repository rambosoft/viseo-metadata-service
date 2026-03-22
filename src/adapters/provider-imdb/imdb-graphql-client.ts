import { setTimeout as delay } from "node:timers/promises";

import {
  DataExchangeClient,
  SendApiAssetCommand,
} from "@aws-sdk/client-dataexchange";

import { ProviderUnavailableError } from "../../core/shared/errors.js";

export type ImdbGraphqlClientPort = {
  execute<T>(args: {
    query: string;
    variables?: Record<string, unknown>;
  }): Promise<T>;
};

type ImdbGraphqlConfig = Readonly<{
  apiUrl: string;
  apiKey: string;
  timeoutMs: number;
  awsRegion: string;
  dataSetId: string;
  revisionId: string;
  assetId: string;
}>;

type GraphQlEnvelope<T> = Readonly<{
  data?: T;
  errors?: ReadonlyArray<
    Readonly<{
      message?: string;
    }>
  >;
}>;

export class ImdbGraphqlClient implements ImdbGraphqlClientPort {
  private readonly endpointPath: string;
  private readonly queryStringParameters: Record<string, string>;

  public constructor(
    private readonly client: Pick<DataExchangeClient, "send">,
    private readonly config: ImdbGraphqlConfig,
  ) {
    const apiUrl = new URL(config.apiUrl);
    this.endpointPath = apiUrl.pathname.length > 0 ? apiUrl.pathname : "/v1";
    this.queryStringParameters = Object.fromEntries(apiUrl.searchParams.entries());
  }

  public async execute<T>(args: {
    query: string;
    variables?: Record<string, unknown>;
  }): Promise<T> {
    const controller = new AbortController();
    const timeout = delay(this.config.timeoutMs, undefined, {
      signal: controller.signal,
    }).then(() => controller.abort());

    try {
      const response = await this.client.send(
        new SendApiAssetCommand({
          AssetId: this.config.assetId,
          DataSetId: this.config.dataSetId,
          RevisionId: this.config.revisionId,
          Method: "POST",
          Path: this.endpointPath,
          RequestHeaders: {
            "accept": "application/json",
            "content-type": "application/json",
            "x-api-key": this.config.apiKey,
          },
          QueryStringParameters:
            Object.keys(this.queryStringParameters).length > 0
              ? this.queryStringParameters
              : undefined,
          Body: JSON.stringify({
            query: args.query,
            ...(args.variables !== undefined ? { variables: args.variables } : {}),
          }),
        }),
        {
          abortSignal: controller.signal,
        },
      );

      const payload = JSON.parse(await readBodyAsString(response.Body)) as GraphQlEnvelope<T>;
      if (payload.errors !== undefined && payload.errors.length > 0) {
        throw new ProviderUnavailableError(
          payload.errors[0]?.message ?? "IMDb unavailable",
        );
      }
      if (payload.data === undefined) {
        throw new ProviderUnavailableError("IMDb unavailable");
      }
      return payload.data;
    } catch (error) {
      if (error instanceof ProviderUnavailableError) {
        throw error;
      }
      throw new ProviderUnavailableError("IMDb unavailable");
    } finally {
      controller.abort();
      await timeout.catch(() => undefined);
    }
  }
}

export function createImdbGraphqlClient(
  config: ImdbGraphqlConfig,
): ImdbGraphqlClientPort {
  const client = new DataExchangeClient({
    region: config.awsRegion,
  });
  return new ImdbGraphqlClient(client, config);
}

async function readBodyAsString(body: unknown): Promise<string> {
  if (body !== null && typeof body === "object") {
    if ("transformToString" in body && typeof body.transformToString === "function") {
      return body.transformToString();
    }
    if (Symbol.asyncIterator in body) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
        chunks.push(
          typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk,
        );
      }
      return new TextDecoder().decode(concatChunks(chunks));
    }
  }

  if (body instanceof Uint8Array) {
    return new TextDecoder().decode(body);
  }

  if (typeof body === "string") {
    return body;
  }

  throw new ProviderUnavailableError("IMDb unavailable");
}

function concatChunks(chunks: readonly Uint8Array[]): Uint8Array {
  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}
