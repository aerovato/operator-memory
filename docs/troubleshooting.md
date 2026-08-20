# Troubleshooting

## Helper And Plugin Installation

### Requirements

Operator Helper requires Node.js 20 or newer.

### Install Or Reinstall The Adapter

```sh
operator-helper install opencode
operator-helper install code-puppy
```

Restart the harness after installation or repair. Until the harness reloads the adapter, setup commands and preamble injection will not behave as expected.

### Helper Updates

Operator Helper automtically checks for and installs updates when commands run. If it cannot determine whether Bun or npm owns the global installation, it asks for a manual update using the original installation method. Registry and installation failures do not block the requested command.

Installed adapters also check for updates and apply successful updates after the harness restarts. If automatic recovery fails, rerun the matching install command and restart the harness.

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
