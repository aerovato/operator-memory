# Troubleshooting

## Helper And Plugin Installation

### Requirements

Operator Helper requires Node.js 20 or newer.

### Install Or Reinstall The Adapter

```sh
operator-helper install opencode
```

Restart OpenCode after installation or repair. Until the harness reloads the plugin, setup commands and preamble injection will not behave as expected.

### Upgrade

Helper reports when a newer version is available:

```sh
operator-helper upgrade
```

Stable OpenCode installations also check for plugin updates and apply successful updates after OpenCode restarts. If automatic plugin recovery fails, reinstall the adapter with `operator-helper install opencode` and restart OpenCode.

## Partition And Memory Repair

Partition and memory repair is agent driven.

### Automatic Repair via Preamble

If any partition fails to load, Operator does not inject a partial Brain. The session preamble becomes a recovery diagnostic instead: it lists partition results and directs repair before ordinary work continues. That diagnostic stays fixed for the session; after a successful fix, the agent can still read the recovered documents into the active conversation without waiting for a new preamble.

The same repair workflow is available on demand through `/operator:repair`.

### Repair Command

Use `/operator:repair` when the preamble reports a load failure, setup looks incomplete, or expected knowledge never appears. A new conversation is useful for focus, but not required—repair can continue in the session that already shows the diagnostic.

Repair runs `operator-helper memory check` and addresses only reported load failures. It does not initialize uninitialized partitions or overwrite unrelated content. Typical ground covered:

- User, Project, and Project Index status
- Index structure and frontmatter
- Whether each available partition can load
- Git ignore configuration and tracked Private files

Project Index files need the lowercase `.md` extension and non-empty `description` and `read_if` frontmatter. Structural checks confirm format only—they do not judge whether an index is accurate or current.

Frequent load failures:

- A required path is a directory instead of a file.
- A Markdown file cannot be read.
- Project Index frontmatter is malformed.
- A partition exists but its expected structure is invalid.

### Private Files Appear In Git

Run `/operator:repair`. Helper ensures the exact `.operator/` entry is in the global Git ignore, but it does not untrack files that were already committed or staged. Repair can identify those paths and guide removal from repository tracking.
