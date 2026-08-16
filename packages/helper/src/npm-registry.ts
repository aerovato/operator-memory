import { Context, Data, Effect, Layer } from "effect";

import { isRecord } from "./utils.ts";

export class NpmRegistryError extends Data.TaggedError("NpmRegistryError")<{
  readonly message: string;
}> {}

export namespace NpmRegistry {
  export interface Interface {
    readonly latestVersion: (packageName: string) => Effect.Effect<string, NpmRegistryError>;
  }

  export class Service extends Context.Service<Service, Interface>()(
    "@aerovato/operator-helper/npm-registry",
  ) {}

  export const layer = Layer.effect(
    Service,
    Effect.gen(function* () {
      return Service.of({
        latestVersion: Effect.fn("NpmRegistry.latestVersion")((packageName: string) => {
          const root = (process.env.NPM_CONFIG_REGISTRY ?? "https://registry.npmjs.org").replace(
            /\/$/,
            "",
          );
          const url = `${root}/${encodeURIComponent(packageName)}/latest`;
          return Effect.tryPromise({
            try: () =>
              fetch(url, { signal: AbortSignal.timeout(5_000) })
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`Registry returned HTTP ${response.status}`);
                  }
                  return response.json();
                })
                .then(value => {
                  if (!isRecord(value) || typeof value.version !== "string") {
                    throw new Error("Registry response has no version");
                  }
                  return value.version;
                }),
            catch: cause =>
              new NpmRegistryError({
                message: `Could not resolve ${packageName}: ${cause instanceof Error ? cause.message : String(cause)}`,
              }),
          });
        }),
      });
    }),
  );
}
