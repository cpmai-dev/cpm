/**
 * Advisory File Locking
 *
 * Provides simple advisory file locking to prevent TOCTOU race conditions
 * when reading/modifying/writing config files like ~/.claude.json or
 * ~/.cursor/mcp.json.
 *
 * Uses a lockfile-based approach: creates a .lock file alongside the target,
 * with a stale lock timeout to prevent deadlocks from crashed processes.
 */

import fs from "fs-extra";

const LOCK_STALE_MS = 10_000; // 10 seconds
const LOCK_RETRY_MS = 100;
const LOCK_MAX_RETRIES = 50; // 5 seconds total

/**
 * Acquire an advisory lock for the given file path.
 * Creates a <filePath>.lock file atomically using exclusive flag.
 *
 * @param filePath - The file to lock
 * @returns A release function to call when done
 * @throws Error if lock cannot be acquired within timeout
 */
export async function acquireLock(
  filePath: string,
): Promise<() => Promise<void>> {
  const lockPath = `${filePath}.lock`;

  for (let i = 0; i < LOCK_MAX_RETRIES; i++) {
    try {
      // Try to create lockfile exclusively (fails if already exists)
      // Use writeFile with 'wx' flag for atomic create-or-fail
      await fs.writeFile(lockPath, String(Date.now()), { flag: "wx" });

      return async () => {
        try {
          await fs.remove(lockPath);
        } catch {
          // Best-effort removal
        }
      };
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "EEXIST") {
        // Lock exists — check if it's stale
        try {
          const content = await fs.readFile(lockPath, "utf-8");
          const lockTime = parseInt(content, 10);
          if (!isNaN(lockTime) && Date.now() - lockTime > LOCK_STALE_MS) {
            // Stale lock, remove and retry
            await fs.remove(lockPath);
            continue;
          }
        } catch {
          // If we can't read the lock, try removing it (may be corrupted)
          await fs.remove(lockPath).catch(() => {});
          continue;
        }

        // Lock is held by another process, wait and retry
        await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Could not acquire lock for ${filePath} after ${LOCK_MAX_RETRIES} retries`,
  );
}

/**
 * Execute a function while holding an advisory lock on a file.
 *
 * @param filePath - The file to lock
 * @param fn - The function to execute while holding the lock
 * @returns The return value of fn
 */
export async function withFileLock<T>(
  filePath: string,
  fn: () => Promise<T>,
): Promise<T> {
  const release = await acquireLock(filePath);
  try {
    return await fn();
  } finally {
    await release();
  }
}
