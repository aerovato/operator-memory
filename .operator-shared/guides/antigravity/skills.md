### Antigravity Skills and Operator Commands

Last Updated: October 11, 2026

Skills are the native explicit-command surface for this binding. Namespacing, full-body expansion, and autonomous suppression are verified on CLI `1.3.3`; graphical equivalents and exact canonical-name collisions remain unverified.

#### Format and Discovery

A skill directory contains `SKILL.md` and optional scripts/resources. Frontmatter requires `description`; `name` is optional, defaults to the directory, and is documented as lowercase/hyphenated. Discovery exposes names/descriptions; activation loads the body.

```markdown
---
name: user-init
description: Runs user setup only when explicitly requested by the user.
disable-model-invocation: true
---

Skill instructions go here.
```

Workspace discovery uses `.agents/skills/<name>/`; legacy `.agent/skills` remains supported. Graphical global skills use `~/.gemini/config/skills/`; the reference lists CLI global skills under `~/.gemini/antigravity-cli/skills/`. Plugin-owned `skills/` is the bundle surface; actual cross-application discovery remains unverified.

#### Namespacing and Explicit Invocation

CLI exposes discovered skills as slash commands, including in print mode. Antigravity 2.0 documents manual skill invocation. `--disable-slash-commands` disables print-mode expansion.

An `operator` plugin with unprefixed `user-init`, `project-init`, `index`, and `repair` skills exposes `/operator:user-init`, `/operator:project-init`, `/operator:index`, and `/operator:repair`. Explicit activation expands the complete skill body into the current conversation. **Do not pre-prefix skill names or directories.** A workspace `/index` can coexist with `/operator:index`; this does not establish every exact-name collision case.

#### Model-Invocation Controls

`disable-model-invocation: true` suppresses autonomous model activation while preserving explicit slash invocation on tested CLI. It is recognized natively despite omission from the main web reference. It is not a prohibition on manually reading a skill file.

`disable-slash-command: true` instead hides the explicit command while leaving model invocation available—the opposite control. A restrictive description alone is not harness-enforced suppression.

#### Operator Workflow Handoff

Skill bodies follow the [reference command prompt](../../specs/reference/implementation.md#commands) and [workflow contract](../../specs/commands.md), not shell expansion or hook-side setup:

- Check `operator-helper version`; run `operator-helper upgrade` when an update is available.
- Run the matching `user init`, `project init`, `index init`, or `memory check` operation.
- Setup follows its emitted guide. Repair stops if clear; otherwise repairs reported load failures, rechecks, and reads applicable memory without initializing absent partitions.
- The agent diagnoses startup/version/operation failures and retries. Helper output is working context, not a wholesale user-facing response.

Preamble rendering is separate: a hook can run `operator-helper preamble`, but must not execute setup workflows on the agent's behalf. Full sentinel-body expansion is verified; actual production setup-body execution is not.

#### Reload and Workflow Migration

`/skills reload` refreshes discovery without restarting; it does not establish hook-code reload or invalidate the session preamble. Legacy IDE workflows stop working on **October 19, 2026**, according to the workflow reference, which directs migration to Agent Skills. Do not build a new adapter on `.agent/workflows`. Its 12,000-character limit is not a skill/hook output limit.

#### Verification Notes

- An `operator` fixture exposed all four canonical commands; each expanded its full sentinel body into the current conversation without hook-side setup. Separate user `/index` and plugin `/operator:index` bodies were invoked correctly.
- `/skills` reported `model_invocable: false` for all four skills with `disable-model-invocation: true`; explicit commands still expanded. This verifies the CLI gate, not graphical behavior or prevention of ordinary file reads.
- Release changes: `1.1.9` print-mode expansion; `1.1.12` slash hiding; `1.2.4` reload; `1.2.7` double-prefix and plugin-collision fixes. Historical reference pages omit some supported frontmatter and illustrate bare names.

#### Sources

- [Skills](https://antigravity.google/docs/skills), [Plugins](https://antigravity.google/docs/plugins), [IDE workflows](https://antigravity.google/docs/ide/workflows), [Headless](https://antigravity.google/docs/cli/headless).
- [Pinned CLI release notes](https://github.com/google-antigravity/antigravity-cli/blob/800852ea61796e9fe53077a2f945e74daacb4be6/CHANGELOG.md).
