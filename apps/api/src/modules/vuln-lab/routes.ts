/**
 * ⚠️ INTENTIONALLY VULNERABLE CODE — LAB MODE ONLY ⚠️
 *
 * These routes are registered only when VULN_MODE=true (see app.ts and config.ts), so the lab copy
 * of Young Owl can be attacked from Kali. Every weakness here is on purpose and is listed in
 * docs/lab-mode.md. Do not copy these patterns into the normal modules.
 */
import { exec } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@young-owl/database';
import type { Config } from '../../config.js';
import { AppError } from '../../lib/errors.js';

export const LAB_ROOT = join(tmpdir(), 'youngowl-lab');
const FILES_DIR = join(LAB_ROOT, 'files');

/** Creates the files the traversal and RCE challenges read. Runs at startup (tmpfs in Docker). */
function prepareLabFiles(config: Config) {
  for (const dir of ['files', 'secret', '.rce'])
    mkdirSync(join(LAB_ROOT, dir), { recursive: true });
  writeFileSync(
    join(FILES_DIR, 'welcome.txt'),
    'Welcome to the Young Owl lab file share.\nFiles in this folder are shared with every user.\n',
  );
  writeFileSync(
    join(FILES_DIR, 'scope.md'),
    '# Scope\n\nIn scope: this Young Owl lab instance only.\nOut of scope: everything else.\n',
  );
  writeFileSync(join(LAB_ROOT, 'secret', 'flag.txt'), `${config.FLAG_TRAVERSAL}\n`);
  writeFileSync(join(LAB_ROOT, '.rce', 'flag'), `${config.FLAG_RCE}\n`);
}

export const vulnLabRoutes: FastifyPluginAsync<{ config: Config }> = async (app, { config }) => {
  prepareLabFiles(config);

  // VULN 1 (beginner): SQL injection. User input is pasted straight into the SQL string,
  // and database errors are sent back to the client.
  app.get('/targets/search', { preHandler: app.requireAuth }, async (req, reply) => {
    const q = String((req.query as { q?: unknown }).q ?? '');
    const sql =
      `SELECT id, name, hostname, ip_address AS "ipAddress", app_type AS "appType", ` +
      `status::text AS status FROM targets ` +
      `WHERE name ILIKE '%${q}%' OR hostname ILIKE '%${q}%' ORDER BY name`;
    try {
      const rows = await prisma.$queryRawUnsafe(sql);
      return { data: rows, query: sql };
    } catch (err) {
      return reply
        .status(500)
        .send({ error: { code: 'DB_ERROR', message: (err as Error).message, query: sql } });
    }
  });

  // VULN 2 (beginner): IDOR. Any logged-in user can export any assessment by id,
  // including other people's private ones. There is no owner check.
  app.get('/assessments/:id/export', { preHandler: app.requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const a = await prisma.assessment.findUnique({
      where: { id },
      include: {
        owner: { select: { email: true, displayName: true, role: { select: { name: true } } } },
        target: true,
        vulnerabilities: true,
      },
    });
    if (!a) throw new AppError(404, 'NOT_FOUND', 'Assessment not found.');
    return a;
  });

  // VULN 3 (intermediate): path traversal. The filter strips "../" only once, so "....//" survives.
  app.get('/files', { preHandler: app.requireAuth }, async (req, reply) => {
    const name = (req.query as { name?: string }).name;
    if (!name) return { data: readdirSync(FILES_DIR) };
    const cleaned = name.replace('../', '');
    try {
      const content = readFileSync(join(FILES_DIR, cleaned), 'utf8');
      return reply.type('text/plain; charset=utf-8').send(content);
    } catch {
      throw new AppError(404, 'NOT_FOUND', `File not found: ${join(FILES_DIR, cleaned)}`);
    }
  });

  // VULN 4 (advanced): OS command injection. The host goes into a shell command unescaped.
  app.post('/tools/lookup', { preHandler: app.requireAuth }, async (req) => {
    const host = String((req.body as { host?: unknown } | undefined)?.host ?? '');
    const output = await new Promise<string>((resolve) => {
      exec(
        `getent hosts ${host} || echo "no such host: ${host}"`,
        { timeout: 5000, maxBuffer: 64 * 1024 },
        (_err, stdout, stderr) => resolve(`${stdout}${stderr}`),
      );
    });
    return { host, output };
  });

  // VULN 5 (beginner): debug endpoint left on, no login, leaks configuration.
  app.get('/system/debug', async () => ({
    node: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    cwd: process.cwd(),
    env: {
      NODE_ENV: config.NODE_ENV,
      DATABASE_URL: config.DATABASE_URL,
      VULN_MODE: config.VULN_MODE,
      SESSION_TTL_HOURS: config.SESSION_TTL_HOURS,
    },
    labFiles: FILES_DIR,
    flag: config.FLAG_DEBUG,
  }));
};
