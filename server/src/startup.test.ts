import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const serverDir = fileURLToPath(new URL('..', import.meta.url));

function startWith(env: Record<string, string>) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: serverDir,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 20_000,
  });
}

describe('a failure at startup', () => {
  it('is one JSON line at fatal level that names the bad setting, then the server exits', () => {
    const result = startWith({ PORT: 'abc' });
    expect(result.status).toBe(1);
    const lines = result.stdout.trim().split('\n');
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]!) as { level: number; msg: string };
    expect(entry.level).toBe(60);
    expect(entry.msg).toContain('PORT');
  });
});
