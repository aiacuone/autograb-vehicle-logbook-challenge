import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import express, { Router } from 'express';

/**
 * Serves the built client, or returns null when there is no build, as in development,
 * where Vite serves the page itself.
 *
 * Real files are served as they are. Any other GET for a page address, such as /result,
 * gets the app's main page, so the client's router can show it. An address with a file
 * extension, such as a missing script, is not a page, so it falls through to "not found"
 * instead of getting HTML that the browser would fail to run.
 */
export function clientFiles(dir: string): Router | null {
  const indexFile = join(dir, 'index.html');
  if (!existsSync(indexFile)) return null;

  const router = Router();
  router.use(express.static(dir));
  router.get('/{*page}', (req, res, next) => {
    if (extname(req.path)) return next();
    res.sendFile(indexFile);
  });
  return router;
}
