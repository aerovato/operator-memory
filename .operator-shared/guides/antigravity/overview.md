### Antigravity Native Integration Guide

Last Updated: October 11, 2026

Reference for Google's native Antigravity application plugin API, not the Python SDK or an implemented Operator adapter. Antigravity 2.0 is the graphical project/orchestration application; CLI `agy` exposes the shared agent engine in a terminal; IDE is the standalone editor surface. Discovery and application-data paths differ by surface.

#### Guide Map

- [Plugins](./plugins.md) — Package structure, discovery, installation, enablement, distribution, replacement, and updates.
- [Hooks](./hooks.md) — Configuration, JSON/event contracts, execution environment, workspace/conversation identity, failures, and user reporting.
- [Injection](./injection.md) — Helper handoff, message placement/types, lifetime, sizes, compaction, restoration, and caching boundaries.
- [Delegation](./delegation.md) — Child context/workspaces, Markdown inheritance, dynamic-agent limitations, and execution-path coverage.
- [Skills](./skills.md) — Format, namespacing, explicit invocation, autonomous suppression, workflow handoff, and migration.

#### Capabilities and Limitations

Native hooks can inject complete user-message payloads and chunked ephemeral messages. Explicit namespaced skills support native autonomous suppression. CLI local installation/replacement preserves disabled state. Ordinary inherited children, nesting, and idle wakeups receive workspace-plugin hooks.

No native prepend/context transform, pre-model abort, or post-compaction-before-model seam is documented. Injected steps follow the current user/tool step. Compaction restoration protects subsequent calls, not the first compacted response. Dynamic agents lack hooks in the tested pathway; multi-root hook metadata does not identify the launch root. CLI failure reporting is diagnostic-log-only in tests, while graphical native error reporting is documented. Provider prompt-cache reuse and Windows/graphical runtime support are not established.

#### Reading Evidence and Documentation

Guide bodies state behavior and bounded constraints; their Verification Notes contain supporting experiment details. Runtime observations cover authenticated Linux ARM64 CLI `1.3.1`/`1.3.3`. Native transcript comparisons and model controls establish the stated cases, not exact provider-wire bytes or universal worker coverage.

Read all native surface tabs on Google's pages: rendered Markdown can omit inactive CLI/IDE panels, whose content remains in HTML. Release notes supersede several reference-page claims; tested executable versions take precedence over the web changelog's latest label. The official CLI repository publishes release notes, not the native engine source; it is not a source-level validation target.

#### Sources

- [Documentation sitemap](https://antigravity.google/llms.txt), [Plugins](https://antigravity.google/docs/plugins), [Hooks](https://antigravity.google/docs/hooks), [Skills](https://antigravity.google/docs/skills), [Rules](https://antigravity.google/docs/rules), [Subagents](https://antigravity.google/docs/subagents).
- [Projects](https://antigravity.google/docs/projects), [Settings](https://antigravity.google/docs/settings), [Marketplace](https://antigravity.google/docs/marketplace), [Graphical changelog](https://antigravity.google/docs/changelog), [pinned CLI release notes](https://github.com/google-antigravity/antigravity-cli/blob/800852ea61796e9fe53077a2f945e74daacb4be6/CHANGELOG.md).
