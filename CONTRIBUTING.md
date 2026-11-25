### Contributing

All maintainers must use Operator Memory while working on this repository and must properly update the Operator documentation in `.operator-shared/` after implementation.

### Reference sources and indexes

The [Shared Project Index](.operator-shared/index/index.md) links to source maps for Operator and public upstream repositories. Each reference tree's owning source subindex contains its upstream URL, local destination, full commit pin, tracking branch, and pinned checkout commands. Narrower subindexes link to that owner.

Read only the guides and indexes relevant to the task. If those documents and Operator's own code answer the question, no reference checkout is needed. When source inspection is necessary, reuse a suitable existing checkout or run only the owning index's commands from the Operator repository root, creating `references/` with `mkdir -p references` if needed. Do not clone the collection as a setup step. Upstream dependency installation and builds are needed only when the task requires them.

The clone commands fetch and select the recorded commit rather than assume the current branch tip matches the index. Follow the source map to relevant files and read that checkout's agent instructions before working within it. Source is authoritative when it differs from an index.

Contributors may update reference source checkouts to the latest relevant upstream version, maintain the shared indexes and affected guides, and commit and push those documentation changes to their contribution branches. Changes to `main` go through a pull request and squash merge. The reference checkouts remain Git-ignored; do not add their source code to the Operator repository.

For an intentional refresh, fetch the owning index's tracking branch and select the intended new revision without discarding local work. A clean checkout already tracking that branch can use `git pull --ff-only`; pinned detached checkouts require an explicit branch or revision selection. Additional history may be fetched when a historical comparison needs it.

Refreshes update the owning index's full checkout pin and affected indexes and guide claims together. Checkout pins identify source snapshots, not live runtime verification. Preserve historical behavioral-verification revisions and dates unless the claims are reverified. Reference maintenance does not itself require changes to Operator dependencies or adapter code.

