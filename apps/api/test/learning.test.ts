import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { prisma } from '@young-owl/database';
import { login, makeApp, SEED } from './helpers.js';

let app: FastifyInstance;
type Session = Awaited<ReturnType<typeof login>>;
let student: Session;

const call = (s: Session, method: 'GET' | 'POST', url: string, payload?: unknown) =>
  app.inject({
    method,
    url: `/api/v1${url}`,
    payload: payload as object,
    headers: { cookie: s.cookie, 'x-csrf-token': s.csrf },
  });

beforeAll(async () => {
  app = await makeApp({ LOGIN_RATE_LIMIT_MAX: '50', RATE_LIMIT_MAX: '1000' });
  student = await login(app, SEED.student);
});
afterAll(async () => {
  await app.close();
});

describe('learning center', () => {
  it('lists published modules with progress fields', async () => {
    const res = await call(student, 'GET', '/learning/modules');
    expect(res.statusCode).toBe(200);
    const mods = res.json().data as Array<Record<string, unknown>>;
    expect(mods.length).toBeGreaterThanOrEqual(6);
    const recon = mods.find((m) => m.slug === 'reconnaissance')!;
    expect(recon.lessonCount).toBeGreaterThan(0);
    expect(recon).toHaveProperty('completedLessons');
    expect(recon).toHaveProperty('quizPassed');
  });

  it('returns a module by slug with lessons and quiz meta but no answers', async () => {
    const res = await call(student, 'GET', '/learning/modules/reconnaissance');
    expect(res.statusCode).toBe(200);
    const m = res.json();
    expect(m.lessons.length).toBeGreaterThan(0);
    expect(m.quiz.questionCount).toBeGreaterThan(0);
    // The module payload must not leak correct answers.
    expect(JSON.stringify(m)).not.toContain('answerIndex');
  });

  it('404s for an unknown module slug', async () => {
    const res = await call(student, 'GET', '/learning/modules/does-not-exist');
    expect(res.statusCode).toBe(404);
  });

  it('serves lesson content and marks it complete', async () => {
    const mod = await call(student, 'GET', '/learning/modules/reconnaissance');
    const lessonId = mod.json().lessons[0].id as string;

    const lesson = await call(student, 'GET', `/learning/lessons/${lessonId}`);
    expect(lesson.statusCode).toBe(200);
    expect(lesson.json().contentMarkdown).toContain('#');

    const done = await call(student, 'POST', `/learning/lessons/${lessonId}/complete`);
    expect(done.statusCode).toBe(200);
    expect(done.json().completed).toBe(true);

    const after = await call(student, 'GET', `/learning/lessons/${lessonId}`);
    expect(after.json().completed).toBe(true);

    // Idempotent: completing again still succeeds.
    const again = await call(student, 'POST', `/learning/lessons/${lessonId}/complete`);
    expect(again.statusCode).toBe(200);
  });

  it('grades a quiz server-side and stores the result', async () => {
    const mod = await call(student, 'GET', '/learning/modules/reconnaissance');
    const quizId = mod.json().quiz.id as string;
    const quiz = await prisma.quiz.findUniqueOrThrow({ where: { id: quizId } });
    const answers = (quiz.questions as Array<{ answerIndex: number }>).map((q) => q.answerIndex);

    const before = await prisma.quizResult.count({ where: { userId: 'x' } });
    const res = await call(student, 'POST', `/learning/quizzes/${quizId}/submit`, { answers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.score).toBe(100);
    expect(body.passed).toBe(true);
    expect(body.feedback.every((f: { correct: boolean }) => f.correct)).toBe(true);

    const stored = await prisma.quizResult.findFirst({
      where: { quizId, score: 100 },
      orderBy: { submittedAt: 'desc' },
    });
    expect(stored).not.toBeNull();
    void before;
  });

  it('fails a quiz with wrong answers', async () => {
    const mod = await call(student, 'GET', '/learning/modules/reporting');
    const quizId = mod.json().quiz.id as string;
    const count = mod.json().quiz.questionCount as number;
    const res = await call(student, 'POST', `/learning/quizzes/${quizId}/submit`, {
      answers: Array.from({ length: count }, () => 9),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().score).toBe(0);
    expect(res.json().passed).toBe(false);
  });

  it('requires login', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/learning/modules' });
    expect(res.statusCode).toBe(401);
  });
});
