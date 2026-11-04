# Operator Memory for Codex

Operator Memory gives Codex durable project and user context maintained by agents as readable Markdown.

### Install

```sh
operator-helper install codex
```

Helper registers the public Git marketplace from `aerovato/operator-memory` and installs its pinned npm release as `aerovato@operator-memory`. Existing Helper-managed local marketplace registrations migrate to the Git source.

Start a fresh Codex session after installation. Codex reviews plugin hooks on startup; approve the Operator hooks when prompted. Until the hooks are trusted, Codex skips preamble injection.

The plugin injects the Operator preamble into new and cleared sessions, reinjects it after context compaction, and injects it into delegated subagents. Resumed and forked sessions keep their existing context.

The three Operator workflows are available as explicitly invoked skills: `$operator-user-init`, `$operator-project-init`, and `$operator-index`. Codex plugins do not register slash commands; invoke the skills by name.

Codex can refresh the Git marketplace in the background. Request an update through its marketplace upgrade action or rerun `operator-helper install codex`, then start a fresh session. Changed hook definitions require renewed trust.
