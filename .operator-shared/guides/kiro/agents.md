# Kiro Subagents

Last Updated: October 5, 2026

## Built-In Subagents

Kiro delegates work to built-in subagents such as `general-task-execution` and `context-gatherer`. Delegation runs in the same harness process as the parent.

## Inheritance

- Subagents do not receive the parent's `SessionStart` or `UserPromptSubmit` hook output. Verified on CLI `2.27.1`, V3 engine (`--v3`), KAS `0.66.22`: delegated built-in agents received neither hook's token while the parent reproduced both.
- Always-included steering is inherited context: both delegated agents reproduced an always-included project steering token.
- There is no documented general subagent start hook. `AgentSpawn` is a compatibility spelling of `SessionStart`, not a delegated-agent event.

## Injection Consequence

Subagent preamble loading must be agent-driven: inherited steering instructs the subagent to run `operator-helper preamble` itself when Operator's preamble guidance is absent.

## Custom Agent Profiles

Custom agent profiles (`.kiro/agents/`, `~/.kiro/agents/`) support profile-local hooks, but profile hooks did not run under delegation in testing, and official pages conflict on IDE support and resource inheritance. Custom-agent configuration is outside Operator's integration scope; Operator uses general mechanisms and requires no custom agents.

Detailed verification and peripheral agent-profile research live in [injection verification](./injection.md), not the adapter workflow.
