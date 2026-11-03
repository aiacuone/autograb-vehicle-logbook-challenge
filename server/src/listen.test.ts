import { createServer, type Server } from 'node:net';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './logger.js';
import { listen } from './listen.js';

const open: { close: () => unknown }[] = [];

afterEach(() => {
  open.splice(0).forEach((server) => server.close());
});

function logLines(lines: string[]) {
  return createLogger('info', {
    write: (line: string) => {
      lines.push(line);
    },
  });
}

function occupy(): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer();
    open.push(server);
    server.listen(0, () => {
      const address = server.address();
      resolve({
        server,
        port: typeof address === 'object' && address ? address.port : 0,
      });
    });
  });
}

describe('listen', () => {
  it('logs that it is listening when the port is free', async () => {
    const lines: string[] = [];
    const { server, port } = await occupy();
    server.close();
    const onFailure = vi.fn();
    const started = listen(express(), port, logLines(lines), onFailure, {
      makes: 3,
    });
    open.push(started);
    await new Promise((resolve) => started.once('listening', resolve));
    expect(onFailure).not.toHaveBeenCalled();
    expect(lines.join('')).toContain('Server listening');
  });

  it('reports a port that is already in use and exits with 1', async () => {
    const lines: string[] = [];
    const { port } = await occupy();
    const onFailure = vi.fn();
    const attempt = listen(express(), port, logLines(lines), onFailure);
    open.push(attempt);
    await vi.waitFor(() => expect(onFailure).toHaveBeenCalledWith(1));
    const output = lines.join('');
    expect(output).toContain('already in use');
    expect(output).not.toContain('Server listening');
    expect(output).not.toContain('stack');
  });
});
