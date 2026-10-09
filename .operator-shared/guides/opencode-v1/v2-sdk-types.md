# SDK Type Definitions

Last Updated: September 15, 2026

Authoritative type definitions from the V2 SDK source. All references relative to `<reference>/opencode-v1/`.

Source: `packages/sdk/js/src/v2/gen/types.gen.ts` unless otherwise noted.

## Legacy Types (Top-Level APIs)

Used by `client.session`, `client.part`, `client.tui` (Session2, Part, Tui).

### Session

```ts
export type Session = {
  id: string
  slug: string
  projectID: string
  workspaceID?: string
  directory: string
  path?: string
  parentID?: string
  summary?: {
    additions: number
    deletions: number
    files: number
    diffs?: Array<SnapshotFileDiff>
  }
  cost?: number
  tokens?: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
  share?: { url: string }
  title: string
  agent?: string
  model?: {
    id: string
    providerID: string
    variant?: string
  }
  version: string
  metadata?: { [key: string]: unknown }
  time: {
    created: number
    updated: number
    compacting?: number
    archived?: number
  }
  permission?: PermissionRuleset
  revert?: {
    messageID: string
    partID?: string
    snapshot?: string
    diff?: string
  }
}
```

### Messages

`Message` is a discriminated union on `role`:

```ts
export type Message = UserMessage | AssistantMessage
```

```ts
export type UserMessage = {
  id: string
  sessionID: string
  role: "user"
  time: { created: number }
  format?: OutputFormat
  summary?: {
    title?: string
    body?: string
    diffs: Array<SnapshotFileDiff>
  }
  agent: string
  model: {
    providerID: string
    modelID: string
    variant?: string
  }
  system?: string
  tools?: { [key: string]: boolean }
}
```

```ts
export type AssistantMessage = {
  id: string
  sessionID: string
  role: "assistant"
  time: { created: number; completed?: number }
  error?:
    | ProviderAuthError
    | UnknownError
    | MessageOutputLengthError
    | MessageAbortedError
    | StructuredOutputError
    | ContextOverflowError
    | ContentFilterError
    | ApiError
  parentID: string
  modelID: string
  providerID: string
  mode: string
  agent: string
  path: { cwd: string; root: string }
  summary?: boolean
  cost: number
  tokens: {
    total?: number
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
  structured?: unknown
  variant?: string
  finish?: string
}
```

### Parts

`Part` is a discriminated union on `type`. All parts share `{ id, sessionID, messageID }`.

```ts
export type Part =
  | TextPart
  | SubtaskPart
  | ReasoningPart
  | FilePart
  | ToolPart
  | StepStartPart
  | StepFinishPart
  | SnapshotPart
  | PatchPart
  | AgentPart
  | RetryPart
  | CompactionPart
```

```ts
export type TextPart = {
  id: string; sessionID: string; messageID: string
  type: "text"
  text: string
  synthetic?: boolean
  ignored?: boolean
  time?: { start: number; end?: number }
  metadata?: { [key: string]: unknown }
}
```

```ts
export type SubtaskPart = {
  id: string; sessionID: string; messageID: string
  type: "subtask"
  prompt: string
  description: string
  agent: string
  model?: { providerID: string; modelID: string }
  command?: string
}
```

```ts
export type ReasoningPart = {
  id: string; sessionID: string; messageID: string
  type: "reasoning"
  text: string
  metadata?: { [key: string]: unknown }
  time: { start: number; end?: number }
}
```

```ts
export type FilePart = {
  id: string; sessionID: string; messageID: string
  type: "file"
  mime: string
  filename?: string
  url: string
  source?: FilePartSource
}
```

```ts
export type ToolPart = {
  id: string; sessionID: string; messageID: string
  type: "tool"
  callID: string
  tool: string
  state: ToolState
  metadata?: { [key: string]: unknown }
}
```

```ts
export type StepStartPart = {
  id: string; sessionID: string; messageID: string
  type: "step-start"
  snapshot?: string
}
```

```ts
export type StepFinishPart = {
  id: string; sessionID: string; messageID: string
  type: "step-finish"
  reason: string
  snapshot?: string
  cost: number
  tokens: {
    total?: number
    input: number; output: number; reasoning: number
    cache: { read: number; write: number }
  }
}
```

```ts
export type SnapshotPart = {
  id: string; sessionID: string; messageID: string
  type: "snapshot"
  snapshot: string
}
```

```ts
export type PatchPart = {
  id: string; sessionID: string; messageID: string
  type: "patch"
  hash: string
  files: Array<string>
}
```

```ts
export type AgentPart = {
  id: string; sessionID: string; messageID: string
  type: "agent"
  name: string
  source?: { value: string; start: number; end: number }
}
```

```ts
export type RetryPart = {
  id: string; sessionID: string; messageID: string
  type: "retry"
  attempt: number
  error: ApiError
  time: { created: number }
}
```

```ts
export type CompactionPart = {
  id: string; sessionID: string; messageID: string
  type: "compaction"
  auto: boolean
  overflow?: boolean
  tail_start_id?: string
}
```

### ToolState

Union on `status`. Used by `ToolPart.state`.

```ts
export type ToolStatePending = {
  status: "pending"
  input: { [key: string]: unknown }
  raw: string
}

export type ToolStateRunning = {
  status: "running"
  input: { [key: string]: unknown }
  title?: string
  metadata?: { [key: string]: unknown }
  time: { start: number }
}

export type ToolStateCompleted = {
  status: "completed"
  input: { [key: string]: unknown }
  output: string
  title: string
  metadata: { [key: string]: unknown }
  time: { start: number; end: number; compacted?: number }
  attachments?: Array<FilePart>
}

export type ToolStateError = {
  status: "error"
  input: { [key: string]: unknown }
  error: string
  metadata?: { [key: string]: unknown }
  time: { start: number; end: number }
}

export type ToolState = ToolStatePending | ToolStateRunning | ToolStateCompleted | ToolStateError
```

### Session2 Method Response Types

`session.messages` returns `{ info: Message, parts: Part[] }[]`:

```ts
export type SessionMessagesResponses = {
  200: Array<{
    info: Message
    parts: Array<Part>
  }>
}
```

`session.prompt` body accepts parts; returns the assistant message info + parts:

```ts
export type SessionPromptData = {
  body?: {
    messageID?: string
    model?: { providerID: string; modelID: string }
    agent?: string
    noReply?: boolean
    tools?: { [key: string]: boolean }
    format?: OutputFormat
    system?: string
    variant?: string
    parts: Array<TextPartInput | FilePartInput | AgentPartInput | SubtaskPartInput>
  }
  path: { sessionID: string }
  query?: { directory?: string; workspace?: string }
}

export type SessionPromptResponses = {
  200: { info: AssistantMessage; parts: Array<Part> }
}
```

`session.fork` returns a new `Session`:

```ts
export type SessionForkResponses = { 200: Session }
```

`session.update` accepts title, metadata, permission, and time:

```ts
export type SessionUpdateData = {
  body?: {
    title?: string
    metadata?: { [key: string]: unknown }
    permission?: PermissionRuleset
    time?: { archived?: number }
  }
  path: { sessionID: string }
}
```

## V2 Types (Native API)

Used by `client.v2.*` services.

### SessionV2Info

```ts
export type SessionV2Info = {
  id: string
  parentID?: string
  projectID: string
  agent?: string
  model?: ModelRef
  cost: number
  tokens: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
  time: { created: number; updated: number; archived?: number }
  title: string
  location: LocationRef
  subpath?: string
  revert?: RevertState
}
```

### ModelRef / LocationRef

```ts
export type ModelRef = {
  id: string
  providerID: string
  variant?: string
}

export type LocationRef = {
  directory: string
  workspaceID?: string
}
```

### Prompt / PromptInput

```ts
export type Prompt = {
  text: string
  files?: Array<PromptFileAttachment>
  agents?: Array<PromptAgentAttachment>
}

export type PromptInput = {
  text: string
  files?: Array<PromptInputFileAttachment>
  agents?: Array<PromptAgentAttachment>
}

export type PromptFileAttachment = {
  uri: string
  mime: string
  name?: string
  description?: string
  source?: PromptSource
}

export type PromptInputFileAttachment = {
  uri: string
  name?: string
  description?: string
  source?: PromptSource
}

export type PromptAgentAttachment = {
  name: string
  source?: PromptSource
}

export type PromptSource = {
  start: number
  end: number
  text: string
}
```

### SessionMessage (V2 Projected)

V2 messages are a discriminated union on `type`:

```ts
export type SessionMessage =
  | SessionMessageAgentSwitched
  | SessionMessageModelSwitched
  | SessionMessageUser
  | SessionMessageSynthetic
  | SessionMessageSystem
  | SessionMessageShell
  | SessionMessageAssistant
  | SessionMessageCompaction
```

```ts
export type SessionMessageUser = {
  id: string
  metadata?: { [key: string]: unknown }
  time: { created: number }
  text: string
  files?: Array<PromptFileAttachment>
  agents?: Array<PromptAgentAttachment>
  type: "user"
}
```

```ts
export type SessionMessageAssistant = {
  id: string
  metadata?: { [key: string]: unknown }
  time: { created: number; completed?: number }
  type: "assistant"
  agent: string
  model: ModelRef
  content: Array<SessionMessageAssistantText | SessionMessageAssistantReasoning | SessionMessageAssistantTool>
  snapshot?: { start?: string; end?: string; files?: Array<string> }
  finish?: string
  cost?: number
  tokens?: {
    input: number; output: number; reasoning: number
    cache: { read: number; write: number }
  }
  error?: SessionErrorUnknown
}
```

```ts
export type SessionMessageAssistantText = {
  type: "text"
  id: string
  text: string
}

export type SessionMessageAssistantReasoning = {
  type: "reasoning"
  id: string
  text: string
  providerMetadata?: LlmProviderMetadata
  time?: { created: number; completed?: number }
}

export type SessionMessageAssistantTool = {
  type: "tool"
  id: string
  name: string
  provider?: {
    executed: boolean
    metadata?: LlmProviderMetadata
    resultMetadata?: LlmProviderMetadata
  }
  state:
    | SessionMessageToolStatePending
    | SessionMessageToolStateRunning
    | SessionMessageToolStateCompleted
    | SessionMessageToolStateError
  time: { created: number; ran?: number; completed?: number; pruned?: number }
}
```

```ts
export type SessionMessageToolStateCompleted = {
  status: "completed"
  input: { [key: string]: unknown }
  attachments?: Array<PromptFileAttachment>
  content: Array<LlmToolContent>
  outputPaths?: Array<string>
  structured: { [key: string]: unknown }
  result?: unknown
}
```

```ts
export type SessionMessageCompaction = {
  type: "compaction"
  reason: "auto" | "manual"
  summary: string
  recent: string
  id: string
  metadata?: { [key: string]: unknown }
  time: { created: number }
}
```

### SessionMessagesResponse (V2)

```ts
export type SessionMessagesResponse = {
  data: Array<SessionMessage>
  cursor: {
    previous?: string
    next?: string
  }
}
```

### Domain Info Types

```ts
export type AgentV2Info = {
  id: string
  model?: ModelRef
  request: ProviderRequest
  system?: string
  description?: string
  mode: "subagent" | "primary" | "all"
  hidden: boolean
  color?: AgentColor
  steps?: number
  permissions: PermissionV2Ruleset
}

export type CommandV2Info = {
  name: string
  template: string
  description?: string
  agent?: string
  model?: ModelRef
  subtask?: boolean
}

export type ProviderV2Info = {
  id: string
  integrationID?: string
  name: string
  disabled?: boolean
  api: ProviderApi  // ProviderAisdk | ProviderNative
  request: ProviderRequest
}

export type ModelV2Info = {
  id: string
  providerID: string
  family?: string
  name: string
  api: ModelApi
  capabilities: ModelCapabilities
  request: { headers: {...}; body: {...}; variant?: string }
  variants: Array<{ id: string; headers: {...}; body: {...} }>
  time: { released: number }
  cost: Array<ModelCost>
  status: "alpha" | "beta" | "deprecated" | "active"
  enabled: boolean
  limit: { context: number; input?: number; output: number }
}

export type SkillV2Info = {
  name: string
  description?: string
  slash?: boolean
  location: string
  content: string
}

export type ReferenceInfo = {
  name: string
  path: string
  description?: string
  hidden?: boolean
  source: ReferenceSource
}

export type ProviderRequest = {
  headers: { [key: string]: string }
  body: { [key: string]: unknown }
}

export type PermissionV2Ruleset = Array<{
  action: string
  resource: string
  effect: "allow" | "deny" | "ask"
}>
```

## V2 Events

V2 events form a discriminated union on `type`. Key event categories:

Session lifecycle:
- `session.created`, `session.updated`, `session.deleted`
- `session.status`, `session.idle`, `session.compacted`
- `session.diff`, `session.error`

Message lifecycle:
- `message.updated`, `message.removed`
- `message.part.updated`, `message.part.removed`, `message.part.delta`

Session next (durable streaming):
- `session.next.prompted`, `session.next.prompt.admitted`
- `session.next.agent.switched`, `session.next.model.switched`
- `session.next.text.started`, `session.next.text.delta`, `session.next.text.ended`
- `session.next.reasoning.started`, `session.next.reasoning.delta`, `session.next.reasoning.ended`
- `session.next.tool.called`, `session.next.tool.progress`, `session.next.tool.success`, `session.next.tool.failed`
- `session.next.tool.input.started`, `session.next.tool.input.delta`, `session.next.tool.input.ended`
- `session.next.step.started`, `session.next.step.ended`, `session.next.step.failed`
- `session.next.compaction.started`, `session.next.compaction.delta`, `session.next.compaction.ended`
- `session.next.revert.staged`, `session.next.revert.cleared`, `session.next.revert.committed`
- `session.next.shell.started`, `session.next.shell.ended`
- `session.next.retried`, `session.next.moved`, `session.next.context.updated`, `session.next.synthetic`

Other:
- `permission.asked`, `permission.replied`
- `question.asked`, `question.replied`, `question.rejected`
- `todo.updated`
- `file.edited`, `file.watcher.updated`
- `pty.created`, `pty.updated`, `pty.exited`, `pty.deleted`
- `mcp.tools.changed`
- `reference.updated`
- `server.connected`, `server.disposed`, `global.disposed`

Each event has `{ id: string; type: string; properties: {...} }`. Session next events additionally carry `{ data: { sessionID, ... } }`.

## Plugin Types

Source: `packages/plugin/src/index.ts`

### PluginInput

```ts
export type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>  // V1 OpencodeClient
  project: Project
  directory: string
  worktree: string
  experimental_workspace: {
    register(type: string, adapter: WorkspaceAdapter): void
  }
  serverUrl: URL
  $: BunShell
}
```

### Plugin / Hooks

```ts
export type Plugin = (input: PluginInput, options?: PluginOptions) => Promise<Hooks>
```

Key hooks:

```ts
export interface Hooks {
  dispose?: () => Promise<void>
  event?: (input: { event: Event }) => Promise<void>
  config?: (input: Config) => Promise<void>
  tool?: { [key: string]: ToolDefinition }
  auth?: AuthHook
  provider?: ProviderHook

  "chat.message"?: (
    input: { sessionID: string; agent?: string; model?: { providerID: string; modelID: string }; messageID?: string; variant?: string },
    output: { message: UserMessage; parts: Part[] },
  ) => Promise<void>

  "chat.params"?: (
    input: { sessionID: string; agent: string; model: Model; provider: ProviderContext; message: UserMessage },
    output: { temperature: number; topP: number; topK: number; maxOutputTokens: number | undefined; options: Record<string, any> },
  ) => Promise<void>

  "chat.headers"?: (
    input: { sessionID: string; agent: string; model: Model; provider: ProviderContext; message: UserMessage },
    output: { headers: Record<string, string> },
  ) => Promise<void>

  "command.execute.before"?: (
    input: { command: string; sessionID: string; arguments: string },
    output: { parts: Part[] },
  ) => Promise<void>

  "tool.execute.before"?: (
    input: { tool: string; sessionID: string; callID: string },
    output: { args: any },
  ) => Promise<void>

  "tool.execute.after"?: (
    input: { tool: string; sessionID: string; callID: string; args: any },
    output: { title: string; output: string; metadata: any },
  ) => Promise<void>

  "tool.definition"?: (
    input: { toolID: string },
    output: { description: string; parameters: any },
  ) => Promise<void>

  "permission.ask"?: (input: Permission, output: { status: "ask" | "deny" | "allow" }) => Promise<void>

  "shell.env"?: (
    input: { cwd: string; sessionID?: string; callID?: string },
    output: { env: Record<string, string> },
  ) => Promise<void>

  "experimental.chat.messages.transform"?: (
    input: {},
    output: { messages: { info: Message; parts: Part[] }[] },
  ) => Promise<void>

  "experimental.chat.system.transform"?: (
    input: { sessionID?: string; model: Model },
    output: { system: string[] },
  ) => Promise<void>

  "experimental.session.compacting"?: (
    input: { sessionID: string },
    output: { context: string[]; prompt?: string },
  ) => Promise<void>

  "experimental.compaction.autocontinue"?: (
    input: { sessionID: string; agent: string; model: Model; provider: ProviderContext; message: UserMessage; overflow: boolean },
    output: { enabled: boolean },
  ) => Promise<void>

  "experimental.text.complete"?: (
    input: { sessionID: string; messageID: string; partID: string },
    output: { text: string },
  ) => Promise<void>

  "experimental.provider.small_model"?: (input: { provider: ProviderV2 }, output: { model?: ModelV2 }) => Promise<void>
}
```

### ToolContext / ToolDefinition

Source: `packages/plugin/src/tool.ts`

```ts
export type ToolContext = {
  sessionID: string
  messageID: string
  agent: string
  directory: string
  worktree: string
  abort: AbortSignal
  metadata(input: { title?: string; metadata?: { [key: string]: any } }): void
  ask(input: { permission: string; patterns: string[]; always: string[]; metadata: { [key: string]: any } }): Promise<void>
}

export type ToolResult =
  | string
  | {
      title?: string
      output: string
      metadata?: { [key: string]: any }
      attachments?: ToolAttachment[]
    }

export type ToolDefinition = ReturnType<typeof tool>
```
