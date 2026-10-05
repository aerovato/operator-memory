# Kiro Injection Verification

Last Updated: October 5, 2026

Verified Kiro V3 injection behavior supporting the [Kiro adapter implementation](../../specs/kiro/implementation.md) and the other Kiro guides. All findings come from CLI binary `2.27.1` running the V3 engine (`--v3`) with KAS `0.66.22`; a version-2 binary can run the V3 engine. They establish behavior of the tested runtime only, not of every hook type, version, or surface.

## Methodology

Headless `kiro-cli --v3 chat` sessions with isolated workspaces, model `deepseek-3.2`, and unique tokens generated per probe. Hook, steering, and skill presence was confirmed through exact-token reproduction by the agent, backed by event logs; every session exited 0 and reported `engine: "v3"`. Skill activation was additionally confirmed through `disclose_context` tool output identifying the exact `SKILL.md` URI and its private body token.

## Main-Agent Injection

Project `SessionStart` and `UserPromptSubmit` command hooks fire in the parent, and their stdout reaches the parent's context. `SessionStart` is the primary preamble injection point.

## Subagent Injection Limitation

- Delegated built-in agents (`general-task-execution`, `context-gatherer`) receive no parent hook output: neither event fired for them, they performed no reads, and the event log contained only parent executions.
- Always-included steering is inherited: both delegated agents reproduced a steering token.
- There is no documented general subagent start hook. `AgentSpawn` is a compatibility spelling of `SessionStart`, not a delegated-agent event.

Consequence: subagent preamble loading must be agent-driven through inherited steering that instructs the subagent to render the preamble itself.

## `KIRO_HOME` Resolution Defect

The documentation says `KIRO_HOME` redirects the global `~/.kiro` directory. In the tested V3 runtime, global hooks, steering, and skills all ignore the override and resolve under ordinary `$HOME/.kiro/`; resources placed only under the override are undiscovered. The interactive `/config hooks` listing also reports zero hooks, so the miss is not limited to headless runs.

Hook discovery controls (identical standalone hook files, absolute-path logging commands):

- Project hook with `KIRO_HOME` set: event and token present in the parent response.
- Redirected-global hook only: no event; the parent reported none.
- Project plus redirected global: only the project event.
- Ordinary-home global with `KIRO_HOME` unset: event present.
- Ordinary-home and redirected global together with `KIRO_HOME` set: only the ordinary-home event.

Steering and skill discovery followed the same pattern: redirected-global-only resources produced no steering token and no registered skill; with both global directories populated, only the ordinary-home steering loaded and only the ordinary-home skill registered. Requesting the redirected skill returned a tool-level not-found error listing only the ordinary-home skill.

Consequence: functional installation targets are `$HOME/.kiro/hooks/`, `$HOME/.kiro/steering/`, and `$HOME/.kiro/skills/` regardless of `KIRO_HOME`. Do not install duplicates into both homes. Other configuration resources and IDE behavior were not tested.

## Custom Agent Profiles

Reference findings, not an Operator integration position; Operator does not install custom agents or require their use.

- The [configuration reference](https://kiro.dev/docs/custom-agents/configuration-reference.md#hooks-field) documents profile-local `hooks.agentSpawn` and `userPromptSubmit` arrays, and [current examples](https://kiro.dev/docs/custom-agents/examples.md) embed a modern `hooks` array using `SessionStart` and `UserPromptSubmit`. Both forms injected output when the tested Markdown profiles ran as main agents; neither ran when those same profiles were delegated.
- Official pages conflict on profile-hook IDE support, legacy migration, and custom-agent resource inheritance.

## Source Notes

- No separate general subagent hook event, directory, or registration scope was found across the official hook, configuration, subagent, agent-profile, CLI migration, permissions, headless, and workflow guides.
- [kirodotdev/Kiro#7671](https://github.com/kirodotdev/Kiro/issues/7671) is an older report of profile hooks ignored in custom subagents; corroboration, not current runtime-source proof.
- [kirodotdev/Kiro#7755](https://github.com/kirodotdev/Kiro/issues/7755) proposes `scope: main/subagents/all`; a feature request, not supported JSON.
- [kirodotdev/Kiro#5440](https://github.com/kirodotdev/Kiro/issues/5440#issuecomment-5048327747) says global hooks shipped in IDE `1.0.182` and CLI `2.13.0`. A sibling comment describing `.kiro/settings/hooks.json` and subagent inheritance is a community prototype, not the released interface.
