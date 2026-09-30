# Code Puppy

## Install

Requires Node.js 20 or newer (for Operator Helper) and the [Helper](../../README.md#install-operator) installed.

```sh
operator-helper install code-puppy
```

This installs the Python adapter to `~/.code_puppy/plugins/operator/`. Restart Code Puppy after installation; newly installed code takes effect in the next process.

## Verify

In a new conversation, ask:

```
Is Operator Memory guidance available to you? Give a brief outline of what it says.
```

The agent should confirm the guidance is loaded and outline the brain, partitions, and memory-aware workflow. If it cannot, injection is not working.

Secondary signal: during agent runs, the bottom status bar shows `Operator Ready`. If the suffix never appears, the plugin failed silently; rerun the install command and restart Code Puppy.

## Commands

- `/operator:user-init`
- `/operator:project-init`
- `/operator:index`
- `/operator:repair`

Run each in a new conversation. See [Workflow](../workflow.md#commands) for what each command does.

## Update

The adapter updates itself automatically in the background through Helper. When an update lands, the status bar shows `Operator updated · Restart Code Puppy to apply` — restart Code Puppy to activate it.

## Troubleshooting

- No `Operator Ready` suffix: rerun `operator-helper install code-puppy` and restart Code Puppy. The indicator is hidden on any failure.
- On Code Puppy older than `0.0.753`, the adapter falls back to a legacy model override. This fallback is incompatible with an active DBOS wrapper: injection is skipped with a warning. Update Code Puppy to `0.0.753` or newer.
- Existing files at `~/.code_puppy/plugins/operator/` that Helper does not manage are never overwritten. If you own files there, remove or rename them and rerun the install command.
- Missing memory or load failures: run `/operator:repair` in a new conversation. See [Troubleshooting](../troubleshooting.md).
