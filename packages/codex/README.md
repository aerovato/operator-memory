# Operator Memory for Codex

Operator Memory gives Codex durable project and user context maintained by agents as readable Markdown.

## Install

```sh
operator-helper install codex
```

Start a fresh Codex session after installation. Codex reviews plugin hooks on startup; approve the Operator hooks when prompted. Until the hooks are trusted, Codex skips preamble injection.

The plugin injects the Operator preamble into new and cleared sessions, reinjects it after context compaction, and injects it into delegated subagents. Resumed and forked sessions keep their existing context.

The four Operator workflows are available as explicitly invoked skills: `$operator-user-init`, `$operator-project-init`, `$operator-index`, and `$operator-repair`. Codex plugins do not register slash commands; invoke the skills by name.

Updates are applied by rerunning `operator-helper install codex`. Hook definitions stay byte-stable across releases, so updates normally do not require renewed trust.
