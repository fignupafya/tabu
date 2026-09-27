import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface JsonFileCodec<T> {
  parse(text: string): T;
  serialize(value: T): string;
  /** Value used while the file doesn't exist yet. */
  empty(): T;
}

/**
 * A document kept in one JSON file, shared by the JSON adapters.
 *
 * Reads are cached until the file changes on disk, so hand edits and CLI changes show up immediately.
 * Updates run one at a time on a fresh read and replace the file atomically.
 * Needs a writable file system: fine locally or on a VPS, not on serverless hosts.
 */
export class JsonFile<T> {
  private cache: { version: string; value: T } | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    readonly filePath: string,
    private readonly codec: JsonFileCodec<T>,
  ) {}

  /** The current value; treat it as read-only (it is cached and shared). */
  async read(): Promise<T> {
    const stat = await fs.stat(this.filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!stat) return this.codec.empty();
    // Timestamps alone miss quick successive writes (Windows updates them in ~16 ms steps);
    // the size and the file id (new after every atomic replace) catch those.
    const version = `${stat.mtimeMs}:${stat.size}:${stat.ino}`;
    if (this.cache?.version === version) return this.cache.value;

    const value = this.codec.parse(await fs.readFile(this.filePath, 'utf8'));
    this.cache = { version, value };
    return value;
  }

  /** Writes `change(current)`; `change` must return a new value, or `current` itself to skip the write. */
  update(change: (current: T) => T): Promise<void> {
    const task = this.queue.then(async () => {
      this.cache = null;
      const current = await this.read();
      const next = change(current);
      if (next === current) return;
      await writeFileAtomic(this.filePath, this.codec.serialize(next));
      this.cache = null;
    });
    this.queue = task.catch(() => undefined);
    return task;
  }
}

async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, content, 'utf8');
  try {
    await fs.rename(tempPath, filePath);
  } catch {
    // Windows refuses to replace a file another program holds open; fall back to a direct write.
    await fs.writeFile(filePath, content, 'utf8');
    await fs.rm(tempPath, { force: true });
  }
}
