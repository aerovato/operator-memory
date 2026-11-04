import { $ as shell, file, write } from "bun";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const $ = shell.cwd(root);
const packages = ["opencode-v2", "pi", "deepseek", "codex", "claude-code", "helper"] as const;

export async function publishAll(bump: string | undefined): Promise<void> {
  if (bump !== "major" && bump !== "minor" && bump !== "patch") {
    throw new Error("Usage: bun run publish:all -- <major|minor|patch>");
  }
  if ((await $`git symbolic-ref --quiet --short HEAD`.text()).trim() !== "main") {
    throw new Error("Release must start from main.");
  }
  if ((await $`git status --porcelain`.text()).trim() !== "") {
    throw new Error("Release requires a clean working tree and staging area.");
  }

  const releases: { directory: string; name: string; version: string; tag: string }[] = [];
  for (const directory of packages) {
    const manifest: { name: string; version: string } = await file(
      resolve(root, "packages", directory, "package.json"),
    ).json();
    const version = (
      await $`sh scripts/resolve-publish-version.sh ${manifest.version} ${bump}`.text()
    ).trim();
    releases.push({ directory, name: manifest.name, version, tag: `${directory}@v${version}` });
  }

  const branch = `chore/release-${Date.now()}`;
  await $`git switch -c ${branch}`;
  for (const release of releases) {
    await $`npm version ${release.version} --no-git-tag-version --workspaces=false --prefix ${`packages/${release.directory}`}`;
  }
  const pluginPath = resolve(root, "packages/claude-code/.claude-plugin/plugin.json");
  const plugin: Record<string, unknown> = await file(pluginPath).json();
  const claude: { version: string } = await file(
    resolve(root, "packages/claude-code/package.json"),
  ).json();
  plugin.version = claude.version;
  await write(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`);
  await $`bun install --lockfile-only --ignore-scripts`;

  const manifests = releases.map(release => `packages/${release.directory}/package.json`);
  const title = "chore(release): publish coordinated package batch";
  await $`git add -- bun.lock packages/claude-code/.claude-plugin/plugin.json ${manifests}`;
  await $`git commit -m ${title}`;
  const head = (await $`git rev-parse HEAD`.text()).trim();
  await $`git push -u origin ${branch}`;
  const body = releases.map(release => `- ${release.name}: ${release.version}`).join("\n");
  const pr = (
    await $`gh pr create --base main --head ${branch} --title ${title} --body ${body}`.text()
  ).trim();
  console.log(pr);
  await $`gh pr merge ${pr} --squash --delete-branch --match-head-commit ${head}`;
  const merged: { mergeCommit: { oid: string } | null } =
    await $`gh pr view ${pr} --json mergeCommit`.json();
  if (merged.mergeCommit === null) {
    throw new Error("Release PR has not merged; no tags were pushed.");
  }
  const commit = merged.mergeCommit.oid;
  await $`git fetch origin main`;
  for (const release of releases) {
    await $`git tag ${release.tag} ${commit}`;
    // GitHub suppresses tag-push events when more than three tags are pushed together.
    await $`git push origin ${`refs/tags/${release.tag}`}`;
  }
  console.log("Release tags pushed. GitHub Actions handles package publication.");
}

if (import.meta.main) {
  const arguments_ = process.argv.slice(2).filter(argument => argument !== "--");
  if (arguments_.length !== 1) {
    console.error("Usage: bun run publish:all -- <major|minor|patch>");
    process.exitCode = 1;
  } else {
    publishAll(arguments_[0]).catch(error => {
      // Stops the batch without reverting commits, deleting tags, or undoing publications.
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
  }
}
