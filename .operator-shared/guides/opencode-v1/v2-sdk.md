# OpenCode V2 SDK Reference

Last Updated: September 15, 2026

SDK facts verified from `<reference>/opencode-v1/` source. Messaging and part behavior details in [`messaging.md`](messaging.md). Type definitions in [`v2-sdk-types.md`](v2-sdk-types.md).

## Source Files

- `packages/sdk/js/src/v2/gen/sdk.gen.ts` — generated V2 SDK client (`OpencodeClient` and all service classes).
- `packages/sdk/js/src/v2/gen/types.gen.ts` — generated V2 SDK types (~13.6k lines).
- `packages/sdk/js/src/v2/client.ts` — `createOpencodeClient` factory, header rewriting, error wrapping.
- `packages/sdk/js/src/v2/index.ts` — package entry: exports client, server, `data` namespace.
- `packages/sdk/js/src/v2/data.ts` — `data.message.user` helper for constructing message objects.
- `packages/plugin/src/index.ts` — V1 plugin hook types (`Plugin`, `PluginInput`, `Hooks`).
- `packages/plugin/src/tool.ts` — `tool()` helper and `ToolContext`.
- `packages/plugin/src/v2/` — V2 plugin system (agent/catalog/command/integration/reference/skill hooks).

## Package Exports

`@opencode-ai/sdk` resolves to `packages/sdk/js/src/index.ts` (V1 SDK). `@opencode-ai/sdk/v2` resolves to `packages/sdk/js/src/v2/index.ts` (V2 SDK). `@opencode-ai/sdk/v2/types` resolves to the generated types only.

## Client Construction

### Standalone

```ts
import { createOpencodeClient } from "@opencode-ai/sdk/v2"

const client = createOpencodeClient({
  baseUrl: "http://127.0.0.1:4096",
  directory: "/path/to/project",          // optional: sets x-opencode-directory header
  experimental_workspaceID: "workspace-id", // optional: sets x-opencode-workspace header
})
```

### From V1 Plugin Input

Plugins loaded through the V1 plugin system receive a V1 `OpencodeClient` in `input.client`. The V1 client stores its underlying HeyApi client as `_client`. A V2 client can wrap the same underlying client:

```ts
import { OpencodeClient } from "@opencode-ai/sdk/v2"

const client = new OpencodeClient({ client: (input.client as any)._client })
```

Source: V1 `_HeyApiClient._client` at `packages/sdk/js/src/gen/sdk.gen.ts:224`. V2 `HeyApiClient.client` at `packages/sdk/js/src/v2/gen/sdk.gen.ts:429`.

## OpencodeClient Structure

The V2 `OpencodeClient` exposes two tiers of services:

- Top-level services (flat parameters, routes under `/session`, `/tui`, etc.)
- V2 sub-services under `.v2` (routes under `/api/session`, `/api/event`, etc.)

### Top-Level Services

| Property | Class | Description |
| --- | --- | --- |
| `session` | `Session2` | Session CRUD, messages, prompt, fork, revert, share, summarize, shell |
| `part` | `Part` | Part update and delete on existing messages |
| `tui` | `Tui` | TUI control: toast, prompt, select session, dialogs |
| `event` | `Event` | SSE event stream at `/event` |
| `config` | `Config2` | Read/update project config |
| `global` | `Global` | Health, global events, dispose, upgrade, global config |
| `provider` | `Provider` | Provider auth, model listing |
| `tool` | `Tool` | Tool listing and IDs |
| `find` | `Find` | Text search, file search, symbol search |
| `file` | `File` | File read, list, status |
| `mcp` | `Mcp` | MCP server management |
| `project` | `Project` | Project listing, directories, git init |
| `pty` | `Pty` | PTY session management |
| `lsp` | `Lsp` | LSP status |
| `formatter` | `Formatter` | Formatter status |
| `permission` | `Permission` | Permission list, reply, respond |
| `question` | `Question` | Question list, reply, reject |
| `vcs` | `Vcs` | Git diff, status, apply |
| `command` | `Command` | Slash command listing |
| `worktree` | `Worktree` | Git worktree create, list, remove, reset |
| `instance` | `Instance` | Instance dispose |
| `path` | `Path` | Working directory and root paths |
| `auth` | `Auth` | Auth credential set/remove |
| `app` | `App` | Agents, skills, log writing |
| `sync` | `Sync` | Sync start, steal, replay, history |
| `experimental` | `Experimental` | Workspace, control plane, console, capabilities, resources, project copy |

### V2 Sub-Services (`client.v2.*`)

| Property | Class | Description |
| --- | --- | --- |
| `session` | `Session3` | Durable session lifecycle: prompt, messages, events, context, history, compact, interrupt, revert |
| `agent` | `Agent` | List registered agents |
| `model` | `Model` | List available models |
| `provider` | `Provider2` | List/get providers |
| `event` | `Event2` | SSE event stream at `/api/event` |
| `fs` | `Fs` | Filesystem read, list, find |
| `command` | `Command2` | List registered commands |
| `skill` | `Skill` | List registered skills |
| `permission` | `Permission3` | Permission requests, saved rules |
| `question` | `Question3` | Question requests, reply, reject |
| `pty` | `Pty2` | PTY create, list, connect, update, remove |
| `health` | `Health` | Server health check at `/api/health` |
| `location` | `Location` | Resolve location (directory + workspace) |
| `integration` | `Integration` | Integration connect, methods, attempts |
| `credential` | `Credential` | Credential update, remove |
| `reference` | `Reference` | List project references |
| `projectCopy` | `ProjectCopy2` | Project copy create, refresh, remove |

## Calling Convention

V2 methods use flat parameters. All methods accept an optional second `options` argument for client-level overrides.

```ts
const result = await client.session.update({
  sessionID,
  title,
  metadata,
})
```

Responses are `{ data?: T; error?: E }`. Use `.data` to access the payload.

## Session APIs

### Session2 (`client.session`) — Legacy-Compatible

Routes under `/session/`. Uses flat parameters.

- `list({ directory?, workspace?, scope?, path?, roots?, start?, search?, limit? })` — list sessions, most recently updated first.
- `create({ parentID?, title?, agent?, model?, metadata?, permission?, workspaceID? })` — create a session.
- `get({ sessionID })` — read session details.
- `update({ sessionID, title?, metadata?, permission?, time? })` — update session fields. `time.archived` controls archival.
- `delete({ sessionID })` — delete an entire session.
- `status()` — map of sessionID to status string (`idle` or busy states).
- `messages({ sessionID, limit?, before? })` — messages with parts, oldest-first. See [`messaging.md`](messaging.md#message-fetching).
- `message({ sessionID, messageID })` — single message with parts.
- `prompt({ sessionID, parts, model?, agent?, noReply?, tools?, format?, system?, variant?, messageID? })` — create user message and run assistant loop unless `noReply: true`.
- `promptAsync({ ... })` — same as `prompt` but returns immediately.
- `deleteMessage({ sessionID, messageID })` — delete message and its parts without reverting files.
- `fork({ sessionID, messageID? })` — fork at a message point.
- `abort({ sessionID })` — abort active processing.
- `revert({ sessionID, messageID?, partID? })` — revert to a previous state.
- `unrevert({ sessionID })` — restore all reverted messages.
- `share({ sessionID })` / `unshare({ sessionID })` — toggle share link.
- `summarize({ sessionID, providerID?, modelID?, auto? })` — generate summary.
- `command({ sessionID, command, arguments?, agent?, model?, variant?, parts? })` — send slash command.
- `shell({ sessionID, command, model?, agent? })` — run shell command in session context.
- `children({ sessionID })` — child sessions forked from parent.
- `todo({ sessionID })` — session todo list.
- `diff({ sessionID, messageID? })` — file changes from a specific message.

### Session3 (`client.v2.session`) — V2 Native

Routes under `/api/session/`. Uses the durable event-sourced session core.

- `list({ order?, limit?, search?, cursor?, project?, subpath? })` — paginated, cursor-based.
- `create({ id?, agent?, model?, location? })` — create at a location.
- `get({ sessionID })` — retrieve by ID. Returns `SessionV2Info`.
- `active()` — sessions currently drained by this process.
- `prompt({ sessionID, prompt?: PromptInput, delivery?: "steer" | "queue", resume?: boolean, id? })` — durably admit one session input.
- `messages({ sessionID, limit?, order?, cursor? })` — projected messages (`SessionMessage[]`), cursor-paginated.
- `message({ sessionID, messageID })` — single projected message.
- `events({ sessionID, after? })` — SSE stream of durable session events.
- `history({ sessionID, limit?, after? })` — finite page of durable events after a sequence.
- `context({ sessionID })` — active context messages (after last compaction).
- `switchAgent({ sessionID, agent? })` — switch agent for subsequent turns.
- `switchModel({ sessionID, model? })` — switch model for subsequent turns.
- `compact({ sessionID })` — trigger compaction.
- `interrupt({ sessionID })` — interrupt active execution.
- `wait({ sessionID })` — wait for session to become idle.
- `revert.stage({ sessionID, messageID?, files? })` — stage revert boundary.
- `revert.clear({ sessionID })` — clear staged revert.
- `revert.commit({ sessionID })` — commit staged revert.
- `permission.list({ sessionID })` / `permission.reply(...)` — session permission requests.
- `question.list({ sessionID })` / `question.reply(...)` / `question.reject(...)` — session questions.

### Prompt Delivery Modes (Session3)

`delivery` controls when the input is promoted into the conversation:

- `"steer"` (default) — promotes at the next safe provider-turn boundary while the current drain requires continuation.
- `"queue"` — remains pending until the session would otherwise become idle.

`resume: false` admits the input without scheduling execution.

## Part APIs (`client.part`)

Routes under `/session/{sessionID}/message/{messageID}/part/`.

- `update({ sessionID, messageID, partID, part? })` — upsert a part. Writes the full part object.
- `delete({ sessionID, messageID, partID })` — delete a single part.

The parent message must already exist. To modify a nested field, read the existing part, copy it, replace the field, and write it back.

## TUI APIs (`client.tui`)

Routes under `/tui/`.

- `showToast({ title?, message?, variant?, duration? })` — toast notification. `variant`: `"info" | "success" | "warning" | "error"`.
- `selectSession({ sessionID? })` — navigate TUI to a session.
- `appendPrompt({ text? })` — append text to the prompt input.
- `submitPrompt()` — submit the current prompt.
- `clearPrompt()` — clear the prompt input.
- `executeCommand({ command? })` — execute a slash command.
- `openHelp()` / `openSessions()` / `openModels()` / `openThemes()` — open dialogs.
- `publish({ body? })` — publish a TUI event.

## Event APIs

Two event tiers exist:

- `client.event.subscribe({ directory?, workspace? })` — SSE at `/event`. Legacy event types.
- `client.v2.event.subscribe()` — SSE at `/api/event`. V2 event types including `SessionNext*` durable events.

V2 events are a discriminated union on `type`. See [`v2-sdk-types.md`](v2-sdk-types.md#v2-events).

## Plugin System

### V1 Plugin Hooks (`packages/plugin/src/index.ts`)

Plugins loaded via the V1 system receive `PluginInput`:

```ts
type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>  // V1 OpencodeClient
  project: Project
  directory: string
  worktree: string
  experimental_workspace: { register(type: string, adapter: WorkspaceAdapter): void }
  serverUrl: URL
  $: BunShell
}
```

A V1 plugin is `async (input: PluginInput, options?) => Promise<Hooks>`.

Relevant hooks for memory plugins:

- `event` — observe all OpenCode events.
- `"chat.message"` — called when a new user message is received.
- `"chat.params"` — modify LLM parameters before provider call.
- `"command.execute.before"` — intercept slash commands before the LLM path.
- `"experimental.chat.messages.transform"` — transform model messages before provider call.
- `"experimental.chat.system.transform"` — transform assembled system prompt.
- `"experimental.session.compacting"` — customize compaction prompt before compaction starts.
- `"experimental.compaction.autocontinue"` — control synthetic auto-continue after compaction.
- `"experimental.text.complete"` — text completion hook.
- `"tool.execute.before"` / `"tool.execute.after"` — intercept tool execution.
- `"tool.definition"` — modify tool definitions sent to the LLM.
- `"shell.env"` — inject shell environment variables.
- `"permission.ask"` — intercept permission prompts.
- `tool` — register custom tools (map of tool name to `ToolDefinition`).
- `config` — mutate plugin/tool configuration.
- `auth` / `provider` — auth and provider hooks.

### V2 Plugin System (`packages/plugin/src/v2/`)

The V2 plugin system uses `define` and `PluginContext`:

```ts
import { define } from "@opencode-ai/plugin/v2/promise"

export default define({
  id: "my-plugin",
  setup(context) {
    // context.agent.transform(...)
    // context.command.transform(...)
    // context.catalog.transform(...)
    // context.skill.transform(...)
    // context.reference.transform(...)
    // context.integration.transform(...)
    // context.aisdk.sdk(...) / context.aisdk.language(...)
    // context.plugin.add(...) / context.plugin.remove(...)
  },
})
```

V2 plugin hooks operate on domain drafts (agent, command, catalog, skill, reference, integration). They do not provide session/message observation hooks. For session/message observation, use V1 hooks.

Two variants exist: `@opencode-ai/plugin/v2/effect` (Effect-based) and `@opencode-ai/plugin/v2/promise` (Promise-based). Both share the same hook interfaces.

### Plugin Tool Registration

```ts
import { tool } from "@opencode-ai/plugin"

const myTool = tool({
  description: "My custom tool",
  args: { query: tool.schema.string().describe("Search query") },
  async execute(args, context) {
    // context: { sessionID, messageID, agent, directory, worktree, abort, metadata(), ask() }
    return "result string"
  },
})
```

`ToolResult` can be a string or `{ title?, output, metadata?, attachments? }`.

## Runtime Constraints

- Plugins cannot create arbitrary assistant messages through the SDK.
- Plugins can create user messages through `session.prompt`.
- Plugins can mutate parts on existing messages through `part.update`.
- Plugins can delete messages and parts through V2 APIs.
- Session metadata is available for small plugin state (`session.update({ metadata })`).
- `noReply: true` persists a user message without triggering an assistant response.
