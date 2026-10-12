### Antigravity Agents and Delegation

Last Updated: October 11, 2026

Native `invoke_subagent` starts concurrent child conversations with dedicated prompts and roles. Coverage observations below apply to workspace-plugin hooks on Linux CLI `1.3.1`/`1.3.3`; they do not prove all global-plugin or internal-worker paths.

#### Child Context, Workspace, and Permissions

Children **do not inherit the parent's conversation history**. Each has its own conversation UUID and needs direct context injection where hooks are available. Built-in `self` shares system instructions/toolsets, not proof of parent hook-message inheritance.

Workspace modes are `inherit`, `branch` (worktree isolation), and `share` (documented directory sharing). CLI `1.3.3` fixes branch/share isolation in multi-repository projects; actual worktree-root behavior remains unverified. Private Brain files may be absent from isolated worktrees because they are ignored; do not substitute another checkout's Private Brain.

Children inherit permission scopes and sandbox settings. Permission requests can bubble to the main UI/subagent panel. This is separate from plugin-hook inheritance. Nesting is limited to ten levels.

#### Built-In Agents and Wakeups

Built-in types include `self`, `research`, and browser delegation through `/browser`. Workspace-plugin PreInvocation executes in tested `self`, `research`, inherited Markdown children, nested `self` grandchildren, and idle children awakened by messages. Each receives its own injected marker.

Idle children retain their conversation when awakened; their UUID stays the same while the invocation counter can reset. Use conversation identity for once-only injection. Marker coverage does not establish complete large-preamble receipt in every child/provider request. Browser hook coverage is unverified.

#### Markdown Agents

Markdown frontmatter `inheritCustomizations` controls adoption of ambient skills, rules, plugins, subagents, and MCP servers; it does not mean history inheritance. Custom Markdown agents inherit ambient customizations by default as described in release notes. Explicit `false` suppresses the tested plugin hook for main and delegated agents. **Respect opt-out; do not rewrite user-owned agents.**

`excludeDefaultComponents: true` removes default prompt/tool components while retaining PreInvocation in the tested main-agent case. It is distinct from customization opt-out. Agent-relative `skills`, `plugins`, `rules`, `agents`, and `hooks` paths resolve relative to the defining agent's directory on CLI `1.3.1` and later, for main/delegated use.

#### Dynamic Agents

The documented `define_subagent` API exposes `name`, `description`, `system_prompt`, and optional MCP/write/subagent tool-group controls. It exposes **no plugin/hook customization-inheritance control**; `inheritCustomizations` is not a documented tool argument.

Fully specified dynamic agents lack the workspace-plugin hook in the tested CLI `1.3.3` pathway, even with inherited model/workspace. They start without the injected marker and can successfully report that absence to the parent. This is a native host coverage limitation, not merely an incomplete-definition error. Do not conceal it with invented parameters or claim universal coverage from ordinary-agent success.

#### Other Execution Paths

`/btw` intentionally suppresses user/workspace hooks on CLI `1.3.3`; the side-question agent has parent context, but complete preamble availability there is unestablished. `/boost` and `/teamwork-preview` use internal workers and isolated workspaces; their hook coverage is unverified. Scheduled tasks and Remote Control are also outside established coverage. Verified idle-child wakeups do not establish every background path.

Keep coverage claims bounded rather than requiring exhaustive internal-worker experiments. Multi-root child sessions share the [workspace identity issue](./hooks.md#workspace-identity). For message retention and restoration, see [Injection](./injection.md).

#### Verification Notes

- Main/child/nested/wakeup checks correlated native hook metadata with UUIDs, injected markers, and transcripts. A wakeup preserved UUID but reset invocation numbering.
- Markdown tests separately checked `inheritCustomizations: false` for main/delegated agents and `excludeDefaultComponents: true` for a main agent; the former suppressed the hook, the latter retained it.
- Dynamic follow-up used Gemini 3.8 Flash, complete `system_prompt`, explicit tool-group flags, inherited model/workspace, and successful parent reporting. There were zero child hook records and no injected marker. A model-reported schema agreed with official parameters, but the raw tool-schema object was not captured. This supersedes the earlier name/description-only experiment.
- An interactive `/btw` test returned its side answer without another hook record. No complete-context claim follows from that result.
- Relevant release changes: `1.1.14` unified inheritance switch; `1.1.25` ambient inheritance defaults; `1.2.1` default-component exclusion; `1.3.1` agent-relative paths; `1.3.3` branch/share isolation and `/btw` hook suppression.

#### Sources

- [Subagents](https://antigravity.google/docs/subagents), [Hooks](https://antigravity.google/docs/hooks), [Boost](https://antigravity.google/docs/boost), [Teamwork](https://antigravity.google/docs/teamwork).
- [Pinned CLI release notes](https://github.com/google-antigravity/antigravity-cli/blob/800852ea61796e9fe53077a2f945e74daacb4be6/CHANGELOG.md).
