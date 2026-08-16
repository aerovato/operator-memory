import { OpencodeClient } from "@opencode-ai/sdk/v2";

type V2ClientOptions = NonNullable<ConstructorParameters<typeof OpencodeClient>[0]>;

export function createV2Client(client: unknown): OpencodeClient {
  const legacyClient = client as { readonly _client: V2ClientOptions["client"] };
  return new OpencodeClient({ client: legacyClient._client });
}
