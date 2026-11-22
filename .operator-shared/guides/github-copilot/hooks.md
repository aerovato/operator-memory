### Copilot Plugin Hook Contract

Last Updated: November 22, 2026

Native command hooks for GitHub Copilot CLI `1.0.114` and the VS Code Copilot target. Open VS Code source verifies the launcher path and its fallback bridge. Timing and model-input observations come from the CLI probe described in [Preamble and delegation](./injection.md).

#### Registration and invocation

An Agent Plugins 1.0 plugin registers native Copilot hooks at `com.github.copilot/hooks/hooks.json`. A single event accepts an array. A hook executable reads one JSON object from stdin and writes one final JSON object to stdout. A plain command can use `bash`, `powershell`, or a cross-platform `command` fallback. The CLI also accepts shell-free `exec` plus `args` as an alternative. Mixing `exec` with a shell field is invalid. `timeoutSec` defaults to 30 seconds and takes precedence over the `timeout` alias.

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "type": "command",
        "bash": "node \"$COPILOT_PLUGIN_ROOT/scripts/preamble.mjs\"",
        "powershell": "& node (Join-Path $env:COPILOT_PLUGIN_ROOT 'scripts/preamble.mjs')",
        "timeoutSec": 15
      }
    ],
    "subagentStart": [
      {
        "type": "command",
        "bash": "node \"$COPILOT_PLUGIN_ROOT/scripts/preamble.mjs\"",
        "powershell": "& node (Join-Path $env:COPILOT_PLUGIN_ROOT 'scripts/preamble.mjs')",
        "timeoutSec": 15
      }
    ]
  }
}
```

This example illustrates native JSON and script lookup. The Node runner is a packaging choice and requires Node on the hook process's PATH. When using a shell-free entry, validate root-token substitution in both the executable and arguments on the deployed version. Never interpolate the event's path or prompt into shell script text. Use the event `cwd` as the Helper subprocess cwd, even when the hook runner itself starts from the plugin directory. The `1.0.114` CLI test received `COPILOT_PLUGIN_ROOT` and ran with the plugin directory as the process cwd while event `cwd` named the project directory. The CLI changelog records expansion of `${COPILOT_PLUGIN_ROOT}` in hook cwd and environment values, plus Copilot/Claude-compatible template variables. Editor launchers can inherit a PATH different from a login shell, including on the same machine.

#### Input and output

- `sessionStart` uses `sessionId`, epoch-millisecond `timestamp`, `cwd`, `source` (`startup`, `new`, or `resume`), and optional `initialPrompt`. The documented native PascalCase alias `SessionStart` changes incoming fields to `session_id`, ISO `timestamp`, `hook_event_name`, and optional `initial_prompt`. Native command output is top-level `additionalContext`. [GitHub Copilot hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference)
- `subagentStart` carries `sessionId`, `timestamp`, `cwd`, `transcriptPath`, `agentName`, and optional display name and description. It accepts top-level `additionalContext`. It can filter agent names via a regex `matcher`. The common child adapter fields `agentId`, `agentType`, and `parentAgentId` are exposed when available. Treat them as opaque and optional in defensive readers. [Delegation coverage](./injection.md#delegation)
- `userPromptSubmitted` sees the submitted prompt. `userPromptTransformed` sees the submitted and model-facing prompt and can return `modifiedTransformedPrompt` before history persistence. The tested CLI differs from the documented output contract for submitted command hooks. [Observed prompt handling](./injection.md#alternate-injection-seams)
- `preCompact` includes transcript path, `trigger` (`manual` or `auto`), and custom summary instructions. It is a notification. Its output cannot modify the summary or attach durable context.
- `sessionEnd` can report `complete`, `error`, `abort`, `timeout`, or `user_exit`. Interactive `/clear` closes the old session and detaches its end hooks. It creates an independent replacement lifecycle. Avoid relying on end hooks to guarantee cleanup.

A successful native start response is:

```json
{ "additionalContext": "complete rendered preamble" }
```

The documented startup and child aggregation joins nonempty contributions using two newlines and drops a contribution that would overflow the combined 10 MiB ceiling. A single invocation is also bounded at 10 MiB. JSON encoding and escaping take output bytes, and the provider has a separate context limit. Keep stdout free of logs and emit no partial JSON. Return `{}` for a deliberate no-op. Native HTTP and prompt hooks serve other purposes. Startup prompt hooks auto-submit text and are interactive-only on the CLI. A command hook keeps the Brain local until the harness sends the resolved prompt.

#### Trust and failure

Native discovery combines machine policy, user, project, then plugin hooks. User files live under `$COPILOT_HOME/hooks/*.json` or the user settings `hooks` map. Project hook files live under `.github/hooks/*.json`; repository and local repository settings under `.github/copilot/` can add inline hooks. The runtime also recognizes documented Claude-compatible settings. Copilot policy files load before these and remain eligible when ordinary hooks are disabled. Separate install-time hook inventory from launch-time trust and enablement.

- Repository hook admission depends on working-directory trust. The CLI offers `--trust-folder` for one new prompt-mode session. VS Code supplies the trust decision to the SDK. A CLI prompt-mode launch from a repository subdirectory can omit root hooks when only that subdirectory is trusted. Plugin, user, and repository eligibility can also be controlled by managed settings. [Editor launch path](./vscode.md#where-plugins-execute)
- `strictPluginOnlyCustomization` can restrict standalone user and workspace hooks. `allowManagedHooksOnly` admits managed hooks and hooks from policy-required plugins. Repository-level `disableAllHooks` skips ordinary hooks across sources for that repository, including plugins. A single hook file can disable itself. Preserve these settings.
- With native sandboxing enabled, ordinary command hooks run under the session filesystem policy. The hook can read its source and write its granted plugin data path. Setting `cwd`, `PATH`, or another environment variable adds no filesystem grant. Validate both the Helper executable and access to all Brain partitions.
- Native start hooks fail open. Exit `0` parses valid JSON. Exit `2` can surface stderr as a warning and continues for start hooks. Other nonzero status and timeouts are logged and continue. Tool-specific denial behavior has different rules and cannot stop the initial model request. A Helper process crash must produce a recovery cue where the host shows one, with no fabricated preamble. See [Preamble and delegation](./injection.md#helper-handoff).
- The hook output and its event inputs can be retained in diagnostic or session data. Keep probe payloads synthetic and avoid diagnostic traces containing real Brain contents.

#### Verification Notes

The `1.0.114` macOS ARM64 probe mounted a namespaced native hook with a trusted synthetic project. It checked event stdin and returned markers against the first provider request. [Provider-input results](./injection.md#verification-notes)

#### Sources

- [GitHub Copilot hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference), [VS Code hook migration](https://code.visualstudio.com/docs/agent-customization/migrate-customizations#migrate-hooks), and [CLI release notes](https://github.com/github/copilot-cli/blob/c41b148a2a85a8502c9e7bf73cb4d04d707f6576/changelog.md).
- `references/copilot-sdk/nodejs/src/types.ts:2028–2076` defines SDK transformed-prompt and startup contracts. `references/copilot-sdk/nodejs/src/session.ts:3186–3215` routes runtime callback calls to registered programmatic handlers. Neither is the native command executor.
