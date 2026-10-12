### Antigravity Preamble Injection

Last Updated: October 11, 2026

The native application API injects conversation steps through command hooks, not an exposed outgoing-system-prompt transform. See [Hooks](./hooks.md) for protocol/runtime and [Delegation](./delegation.md) for child coverage. Size/lifetime observations are from Linux ARM64 CLI `1.3.1`/`1.3.3`, not guarantees for every surface or arbitrary payload size.

#### Resolution and Message Placement

Operator's [Helper-subprocess pathway](../../specs/reference/implementation.md#preamble-resolution) obtains one complete `operator-helper preamble` output for the resolved project root. Output is either the normal preamble or canonical all-or-nothing diagnostic. Preserve it unchanged; do not reconstruct partitions, truncate the Brain, or inject substitutes.

Encode the output inside a native hook response:

```json
{
  "injectSteps": [
    { "userMessage": "Complete unchanged Helper output" }
  ]
}
```

Observed trajectory order is existing history, current user/tool step, injected steps, then model response. No prepend operation or insertion index is documented. Once-only user injection stays near the beginning of retained history, after the initial prompt; repeated injection lands at the current tail. `SYSTEM_SDK` identifies the injection source, not a provider system role. **Provider placement and prompt-cache reuse are unverified.** Caching rendered text locally does not create a stable provider system prefix.

#### Message Types and Lifetime

`userMessage` persists as native `USER_INPUT`, wrapped in `<USER_REQUEST>`/metadata, and increments user-turn accounting. A once-per-conversation binding can inject through the first PreInvocation and return `{}` on ordinary later calls. Guard with conversation identity, not the resetting invocation counter; see [Conversation Identity](./hooks.md#conversation-identity).

`ephemeralMessage` is documented as transient system content and is stored as native `EPHEMERAL_MESSAGE`. **Disk persistence does not imply later model-context retention.** On tested later user turns without reinjection, previously supplied ephemeral identifiers were unavailable; reinjecting identical content restored access. This supports transient model availability across those user turns. Tool-continuation, retry, and compaction lifetime are not established.

`toolCall` executes an injected tool call; it is not a direct system-prefix replacement. Stop continuation `reason` is another documented system-message mechanism, but runs when execution is ending and starts another execution; full-preamble size handling is unverified. PostInvocation accepts the same message types after the model response, too late to protect that response.

#### Size Limits

For a single ephemeral message, CLI `1.3.1`/`1.3.3` truncates a tested large payload to a **48 KiB prefix** plus notices. Do not use one large ephemeral string for a complete Brain.

CLI `1.3.3` preserves a tested 144,029-byte user-message payload in full. Multiple ephemeral messages are a separate verified size alternative: three **40 KiB** steps in one response preserve all **120 KiB** in native transcripts and deliver all tail markers. This establishes that the single-message cutoff is not an aggregate cutoff at that tested size, not unlimited user-message or chunked output.

Static rules are not equivalent to hook injection. Rules have a 24,000-byte per-file limit after includes and a 20,000-token aggregate budget, with truncation/demotion. Markdown-agent system prompts apply to configured agents, not a general plugin-controlled model-boundary transform. Skills/tool results enter the trajectory and offer no established compaction bypass.

#### Compaction and Restoration

Automatic compaction can replace the full injected user preamble in active context with a checkpoint containing only an extract/summary. Original complete history remaining on disk does not mean the model still receives it. CLI `1.3.3` has no `/compact` command.

The supplied `transcriptPath` exposes new `CHECKPOINT` steps. A hook can detect a new checkpoint and restore the complete cached preamble as `userMessage` once for that checkpoint. PostInvocation restoration protects subsequent calls; resume-time PreInvocation can handle a checkpoint already present. Ordinary later callbacks must not restore again.

**The first model invocation after automatic compaction can lack the complete preamble.** At the observed boundary, PreInvocation ran before the checkpoint existed, and PostInvocation saw it only after the compacted model response had completed. That response may include tool calls. No native PostCompact-before-model seam is documented.

A true non-persisted outgoing-context transform applied after compaction could avoid dependence on retained history, but the native plugin API exposes no equivalent. Returning constant chunks from the same PreInvocation hook does not create that transform. Repeated ephemeral injection is not an established bypass for the compaction-producing invocation.

#### Coverage and Implementation Constraints

Main, tool-continuation, ordinary inherited child, nested-child, and idle-wakeup hooks are observed. Children have separate UUIDs; dynamic-agent and intentional opt-out boundaries are described in [Delegation](./delegation.md). Neither global hooks nor all internal worker paths are proved by these workspace-plugin tests.

Use the event's actual project root, not plugin cwd or the first multi-root entry. Preserve complete normal/diagnostic output and use conversation-aware lifecycle state. Do not re-render every invocation solely to track Brain edits; follow the [preamble contract](../../specs/preamble.md). Native failure reporting/blocking limits remain as described in [Hooks](./hooks.md#failures-and-user-reporting).

#### Verification Notes

- Single-message comparison: 144,029 emitted ephemeral bytes became a 49,152-byte prefix plus notices, 49,311 stored bytes; the tail disappeared. Identical user-message output preserved all payload bytes and its tail. Real 18,904-byte Helper output was unchanged in either format. Comparisons refer to payload content, not equality to the entire native user wrapper or captured provider requests.
- Chunking: three 40,960-byte ephemeral strings had matching emitted/stored SHA-256 hashes; Gemini 3.8 Flash returned all three random tails. Accounting remained one user turn.
- Lifetime: once-injected chunks were unavailable for distinct unreported identifiers on two later user turns in the same process. No earlier-answer/history leakage or compaction occurred. An identical reinjection control returned all six identifiers. Native cumulative input-token increments were approximately 12 Ki without injection versus 40 Ki with it. This is combined behavioral/usage evidence, not provider-wire capture.
- Actual compaction: a 103,723-byte preamble produced a 13,037-byte incomplete checkpoint at step `16`. PreInvocation saw no checkpoint; PostInvocation saw checkpoint `16` and completed response `17`. Complete restoration appeared at step `32`; response `35` received the missing tail, and an ordinary later callback did not repeat restoration.
- Sonnet generated the actual checkpoint; Gemini completed restoration/receipt checks. Terminal quota errors prevented a clean end-to-end success claim, although byte-complete restoration and subsequent receipt are established. An earlier restoration attempt was invalid because the fixture exited before flushing stdout; it is not evidence of a native payload limit. Large hook responses must finish writing before process exit.

#### Sources

- [Hooks](https://antigravity.google/docs/hooks), [Rules](https://antigravity.google/docs/rules), [Subagents](https://antigravity.google/docs/subagents).
- [Pinned CLI release notes](https://github.com/google-antigravity/antigravity-cli/blob/800852ea61796e9fe53077a2f945e74daacb4be6/CHANGELOG.md), including compaction-budget changes in `1.2.8`.
- Operator [adapter pathways](../../specs/reference/implementation.md#preamble-injection) and [preamble contract](../../specs/preamble.md).
