import { resolve } from "node:path";

import type { Result } from "../utils.ts";
import type { MemoryLoadError } from "./common.ts";
import {
  loadProjectPartition,
  PROJECT_PRIVATE_ROOT,
  PROJECT_SHARED_ROOT,
  type ProjectPartitionSnapshot,
  type ProjectPartitionStatusSnapshot,
} from "./project.ts";
import {
  loadUserPartition,
  type UserPartitionSnapshot,
  type UserPartitionStatusSnapshot,
} from "./user.ts";

export type MemorySnapshot = {
  readonly shared: Result<ProjectPartitionSnapshot, MemoryLoadError>;
  readonly user: Result<UserPartitionSnapshot, MemoryLoadError>;
  readonly private: Result<ProjectPartitionSnapshot, MemoryLoadError>;
};

export type MemoryStatusSnapshot = {
  readonly shared: Result<ProjectPartitionStatusSnapshot, MemoryLoadError>;
  readonly user: Result<UserPartitionStatusSnapshot, MemoryLoadError>;
  readonly private: Result<ProjectPartitionStatusSnapshot, MemoryLoadError>;
};

export function loadMemorySnapshot(
  projectDirectory: string,
  homeDirectory: string,
  loadFiles: true,
): Promise<MemorySnapshot>;
export function loadMemorySnapshot(
  projectDirectory: string,
  homeDirectory: string,
  loadFiles: false,
): Promise<MemoryStatusSnapshot>;

export async function loadMemorySnapshot(
  projectDirectory: string,
  homeDirectory: string,
  loadFiles: boolean,
): Promise<MemorySnapshot | MemoryStatusSnapshot> {
  const sharedRoot = resolve(projectDirectory, PROJECT_SHARED_ROOT);
  const userRoot = resolve(homeDirectory, ".operator", "user");
  const privateRoot = resolve(projectDirectory, PROJECT_PRIVATE_ROOT);

  if (!loadFiles) {
    const [shared, user, privatePartition] = await Promise.all([
      loadProjectPartition(sharedRoot, false),
      loadUserPartition(userRoot, false),
      loadProjectPartition(privateRoot, false),
    ]);
    return { shared, user, private: privatePartition };
  }

  const [shared, user, privatePartition] = await Promise.all([
    loadProjectPartition(sharedRoot, true),
    loadUserPartition(userRoot, true),
    loadProjectPartition(privateRoot, true),
  ]);
  return { shared, user, private: privatePartition };
}
