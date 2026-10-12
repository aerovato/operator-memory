# Harness Guide Standard

Last Updated: October 11, 2026

Rules for `.operator-shared/guides/<harness>/` so every guide directly drives an Operator Memory adapter implementation. The Antigravity guides are the reference implementation.

## Purpose and Prerequisites

- Guides exist to enable Operator Memory adapters — not to mirror, summarize, or download vendor documentation. The [adapter contract](./implementation.md), [preamble contract](../preamble.md), and [command contract](../commands.md) define what a harness must provide.
- Before writing, the author must understand the Operator Memory implementation and its required facilities: complete-preamble injection seam, subagent coverage, lifecycle and compaction behavior, command registration, installation and updates, and failure semantics.
- Apply a relevance filter: every section must serve an implementation question. Do not record random pages, features with no Operator bearing, or exhaustive API inventories without direction.
- Do not state excessively obvious facts. If a competent implementor would already know it, or it has no bearing on the adapter, omit it.

## Completeness

- Guides must be complete enough that the implementing agent does not need to consult the harness's official documentation or source code. Cover every implementation-relevant behavior: discovery paths, protocols, limits, failure modes, and discrepancies.
- When harness source code is available, use it. Cloned source is the strongest verification form — stronger than documentation or release notes — and cited file paths from `reference/<repo-name>/` anchor claims to real code. Verify documented claims against source where possible; when documentation and source disagree, source wins and the discrepancy is recorded.
- Leave no room for interpretation. If documentation answers an implementor's question, state it; if undocumented, verify it and state the result. Open questions appear only as explicitly labeled unestablished boundaries.
- Where multiple implementation pathways exist, present each one's facilities and limitations. Guides never select the pathway — that decision belongs to the user in the plan. Guides may rank practicality and identify dead ends.
- State hard boundaries as explicit prohibitions attached to the fact they guard, for example "do not invent hook fields" or "do not claim unverified coverage".

## Structure

- One `overview.md` per harness: scope, guide map, capability and limitation summary, how to read evidence, and primary sources. It navigates; it does not duplicate topic content.
- One guide per implementation concern. Split when a file answers two distinct implementor questions; merge when two files answer one.
- Every guide opens with `Last Updated: <date>` plus a one-paragraph scope naming the surfaces and versions its runtime observations cover. Include dates wherever observations or versions are pinned.
- Every guide ends with a `Sources` section listing official pages, pinned release notes, and cited source-clone paths.

## Prose

- Organize around implementor questions: where does the preamble go, does it survive compaction and retries, do subagents receive it, how do commands register and stay explicit-only, how does install, replace, and update behave, and what happens on failure.
- Lead with bounded facts and inline constraints, for example "tested at 120 KiB on CLI 1.3.3" or "provider placement unverified". Never bury a limitation in an appendix.
- `Verification Notes` at the end is the only home for methodology, payloads, step indices, and test narrative; conclusions live in the body.
- Label claim strength: documented, verified (surface, version, date), or unestablished.
- Cross-reference between guides with anchored links instead of restating a fact; one fact, one home.
- Include copyable examples for manifest, hook, and skill shapes and for native commands.
- Record documentation discrepancies where the correct behavior lives, citing the superseding source.

## Experiments and Privacy

- Undocumented behavior is verified experimentally, not speculated about; the verified conclusion enters the guide body with its bounds.
- Experiments are conducted privately and never pollute the shared partition: no private paths, archives, research documents, credentials, or account details appear in guides.
- Pin tested executable versions and dates over web-changelog labels, and note how binaries were verified.

## Maintenance

- After a behavior change, update the owning guide, its `Last Updated` date, and cross-references.
- New results update the bounded fact plus its Verification Notes entry; no new sections for one-off findings.
