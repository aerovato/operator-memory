### Copilot Preamble Injection and Delegation

Last Updated: November 22, 2026

Main-agent and child model context, lifecycle, and failure semantics for GitHub Copilot CLI `1.0.114` on macOS ARM64. VS Code Copilot uses a related native runtime with a separate launch path. Its model-input behavior requires its own verification.

#### First model invocation

A native `sessionStart` command hook can return `additionalContext` for the first model request. In the CLI probe, the returned string reached the provider as a distinct **user-role** message before the ordinary user prompt. The marker remained byte-exact. The CLI also serialized the hook result in its session event journal. The observation does not establish a system-message extension seam, a private non-persistent transform, or equivalent behavior on every provider route. Account for local persistence when choosing a binding.

The hook contract recognizes `new`, `startup`, and `resume`. Use `source` and the opaque root `sessionId` to identify observed transitions. A PID, shell instance, or directory cannot identify a session. A new `/clear` lifecycle, a resume, a fork, and an in-place compaction have distinct semantics. Treat the path in each hook event as contextual input and handle missing or unsupported workspace identity explicitly. In VS Code the active directory can be a worktree or a selected folder, and the hook subprocess can start elsewhere.

#### Cold resume and compaction

In the `1.0.114` prompt-mode test, resuming with the plugin mounted fired `sessionStart` with the same session ID and `source: "resume"`. The next provider request contained the new start marker once. Resuming without the mount preserved conversational turns and contained no start marker. The journal's old hook output alone did not restore that context. Rerender on cold resume for this pathway. A native CLI prompt-mode resume is incompatible with `--trust-folder`.

A manual `/compact` issued as its own cold CLI invocation fired `preCompact` with `trigger: "manual"`. The summarization request contained no startup marker or returned pre-compact marker in that run. The next cold prompt fired `sessionStart` and received a fresh marker alongside summarized history. This establishes cold reopen behavior. In-place compaction within a live session, automatic compaction, context retention when no new start hook fires, retry behavior, and fork semantics remain unestablished.

#### Helper handoff

- Validate the relevant identity and absolute event `cwd`. Execute `operator-helper preamble` directly with that cwd and with a bounded deadline shorter than the hook deadline. Keep the shell out of the Helper subprocess and read complete stdout before serializing the response. The same Helper resolves the User, Project Private, and Project Shared partitions and determines the current preamble format.
- A successful Helper run supplies the complete normal preamble or the canonical diagnostic. Return that output unchanged inside `additionalContext`. Keep JSON framing separate from the content. A missing partition is handled by Helper, so the hook does not invent or combine content. [Preamble contract](../../specs/preamble.md)
- An unexpected launch or resolution error produces no context and a concise user-visible recovery cue where supported. Startup hooks fail open. Treat the resulting request-without-context behavior as a host boundary in a future binding and test whether stderr/exit 2 reaches each intended client. Do not equate visible installation with a healthy hook.
- Do not introduce a shared preamble file or cache keyed only by project path. A lifecycle-based adapter can rerender on legitimate boundaries. If a selected binding promises the same bytes to every associated child, demonstrate it under concurrent launches and mid-session Brain edits. A disk cache expands what downstream sessions may read and requires explicit ownership, scoping, cleanup, and permission decisions.

#### Alternate injection seams

- Native `userPromptTransformed` takes the runtime's transformed prompt and can replace its model-facing value. The modified text persists in the user event, while the original displayed text stays separate. In the tested native CLI command hook, the replaced text reached the provider. This can attach context to later *submitted prompts*. It does not intercept each model call: compaction requests, tool continuations, internal notifications, and delegated steps have their own boundaries. The callback is mutation-only and cannot abort the submission.
- GitHub's hook reference says command and HTTP `userPromptSubmitted` outputs are dropped and only SDK programmatic hooks can modify the prompt. The tested `1.0.114` command hook's `modifiedPrompt` reached the later transform hook in all three mounted layouts. This behavior is different in the pinned VS Code non-file bridge, which discards command output from submitted hooks. Use the narrower documented contract for cross-surface design unless a bounded binding deliberately relies on a pinned executable result.
- Native `preCompact` output is observational. `postToolUse` appends context to a tool result with a documented 10 KB combined ceiling. It executes after tool use. Neither facility replaces pre-model coverage. An SDK-owned client can configure programmatic callbacks and a system message. Native plugins installed in the stock CLI or VS Code do not thereby acquire control of session creation or SDK request assembly.
- Repository instructions and always-applied rules can add static text. MCP resources, a setup skill, or a custom agent depend on their invocation or selection. Those surfaces do not implement dynamic first-call rendering of the complete Operator preamble as a generic plugin.

#### Delegation

For YAML-based built-in or custom agents that emit `subagentStart`, the documented hook prepends its `additionalContext` to the first child user message. Do not assume the child sees the parent's startup context or that `SessionStart` fires for a child. A child firing hooks can supply agent and parent IDs, and child agents can use their own directory or permissions. GitHub’s hook reference excludes the built-in **general-purpose** agent from `subagentStart` and `subagentStop`. In the `1.0.114` test, explicit synchronous `task` calls naming `explore` and `general-purpose` each emitted `subagentStart` with the root session ID and child identity. Each child’s first provider request started its user task text with the child marker and omitted the root-start marker. The result establishes that launch route. It does not verify the implicit default agent, child stop events, nested or asynchronous launches, worktrees, or VS Code. If only selected types are covered, report that boundary before describing an adapter as fully supported. [GitHub child hook contract](https://docs.github.com/en/copilot/reference/hooks-reference#subagentstart)

#### Verification matrix

- Fresh session in the project root and a nested directory. Inspect first provider input and event cwd. Exercise representative user, private, and shared partition content.
- Subsequent user turn, retry, and a tool-result continuation. Check placement, duplication, and persistence of the exact preamble. Exercise unexpected Helper failure, timeout, and canonical load diagnostic independently.
- Reopen a session and compare retained context with freshly rendered memory. Include process restart, interactive `/clear`, fork if the host offers it, and plugin disable/enable. For compaction, inspect both the summarization request and the first model request that consumes compacted history. Use a synthetic marker and compare request bytes.
- Compare named and general-purpose child prompts. Verify nested child scope, concurrent child launches, and a child whose working directory differs. Check CLI and VS Code Agent Host separately.
- Check the longest representative rendered preamble within the hook's byte bound and the provider's token budget. Keep production memory out of logs. Confirm fresh and resumed behavior with sandboxing enabled, on supported platforms, and from an editor-launched environment.

#### Verification Notes

The isolated CLI fixture used the official `v1.0.114` macOS ARM64 release and a loopback OpenAI-compatible chat-completions endpoint with a canned response. Legacy, Agent Plugins 1.0, and Agent Plugins 1.1 manifests ran native startup, submitted, and transformed hooks with independent markers. Inspection covered hook inputs, the first provider request, and the session event journal. In the 1.1 package, a distinct portable root `SessionStart` command did not execute while the namespaced native command ran. Additional CLI fixture runs reopened the same journal with and without its plugin mount and compacted it in a separate process. The child fixture used a canned provider tool call with explicit `agent_type` and `mode: "sync"`. All payloads were synthetic and requests went only to the loopback inference endpoint.

#### Sources

- [Native hook reference](https://docs.github.com/en/copilot/reference/hooks-reference) and [CLI 1.0.114 release](https://github.com/github/copilot-cli/releases/tag/v1.0.114).
- `references/copilot-sdk/docs/hooks/session-lifecycle.md:10–12,160–178` describes the SDK startup boundary. `references/copilot-sdk/nodejs/src/types.ts:2028–2076,2170–2193` defines relevant native SDK inputs and outputs. `references/copilot-sdk/nodejs/src/generated/session-events.ts:11986–12096` describes hook event-journal payloads. `references/copilot-sdk/nodejs/src/types.ts:1394–1451` exposes the host-owned system-message configuration.
- `references/vscode/src/vs/platform/agentHost/node/copilot/copilotPluginConverters.ts:460–468,554–602` establishes the non-file bridge limits. The [VS Code integration guide](./vscode.md) identifies the target's on-disk runtime path.
