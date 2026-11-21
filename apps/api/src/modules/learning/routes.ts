import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@young-owl/database';
import {
  PERMISSIONS as P,
  idParamSchema,
  quizSubmitSchema,
  slugParamSchema,
} from '@young-owl/shared';
import { audit } from '../../lib/audit.js';
import { NotFound } from '../../lib/errors.js';
import { route } from '../../lib/route.js';

interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export const learningRoutes: FastifyPluginAsync = async (app) => {
  // List published modules with the current user's progress per module.
  route(
    app,
    {
      method: 'GET',
      url: '/learning/modules',
      tag: 'Learning',
      summary: 'List learning modules with progress',
      access: [P.LEARN_READ],
    },
    async ({ user }) => {
      const modules = await prisma.learningModule.findMany({
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        include: {
          lessons: { select: { id: true }, orderBy: { order: 'asc' } },
          quizzes: { select: { id: true } },
        },
      });
      const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
      const [done, passes] = await Promise.all([
        prisma.lessonProgress.findMany({
          where: { userId: user.id, lessonId: { in: lessonIds }, completedAt: { not: null } },
          select: { lessonId: true },
        }),
        prisma.quizResult.findMany({
          where: { userId: user.id, passed: true },
          select: { quizId: true },
        }),
      ]);
      const doneSet = new Set(done.map((d) => d.lessonId));
      const passSet = new Set(passes.map((p) => p.quizId));
      return {
        data: modules.map((m) => {
          const completed = m.lessons.filter((l) => doneSet.has(l.id)).length;
          return {
            id: m.id,
            slug: m.slug,
            title: m.title,
            description: m.description,
            category: m.category,
            difficulty: m.difficulty,
            order: m.order,
            lessonCount: m.lessons.length,
            completedLessons: completed,
            quizPassed: m.quizzes.some((q) => passSet.has(q.id)),
          };
        }),
      };
    },
  );

  // One module by slug: lessons (with completion), quiz meta (no answers).
  route(
    app,
    {
      method: 'GET',
      url: '/learning/modules/:slug',
      tag: 'Learning',
      summary: 'Module detail with lessons and quiz',
      access: [P.LEARN_READ],
      params: slugParamSchema,
    },
    async ({ params, user }) => {
      const m = await prisma.learningModule.findFirst({
        where: { slug: params.slug, isPublished: true },
        include: {
          lessons: { orderBy: { order: 'asc' } },
          quizzes: true,
        },
      });
      if (!m) throw NotFound('Module');
      const [done, lastResults] = await Promise.all([
        prisma.lessonProgress.findMany({
          where: {
            userId: user.id,
            lessonId: { in: m.lessons.map((l) => l.id) },
            completedAt: { not: null },
          },
          select: { lessonId: true },
        }),
        prisma.quizResult.findMany({
          where: { userId: user.id, quizId: { in: m.quizzes.map((q) => q.id) } },
          orderBy: { submittedAt: 'desc' },
        }),
      ]);
      const doneSet = new Set(done.map((d) => d.lessonId));
      const bestByQuiz = new Map<string, { score: number; passed: boolean }>();
      for (const r of lastResults) {
        const cur = bestByQuiz.get(r.quizId);
        if (!cur || r.score > cur.score)
          bestByQuiz.set(r.quizId, { score: r.score, passed: r.passed });
      }
      return {
        id: m.id,
        slug: m.slug,
        title: m.title,
        description: m.description,
        category: m.category,
        difficulty: m.difficulty,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          estimatedMinutes: l.estimatedMinutes,
          order: l.order,
          completed: doneSet.has(l.id),
        })),
        quiz: m.quizzes[0]
          ? {
              id: m.quizzes[0].id,
              title: m.quizzes[0].title,
              passingScore: m.quizzes[0].passingScore,
              questionCount: (m.quizzes[0].questions as unknown as QuizQuestion[]).length,
              best: bestByQuiz.get(m.quizzes[0].id) ?? null,
            }
          : null,
      };
    },
  );

  // Lesson content by id.
  route(
    app,
    {
      method: 'GET',
      url: '/learning/lessons/:id',
      tag: 'Learning',
      summary: 'Lesson content',
      access: [P.LEARN_READ],
      params: idParamSchema,
    },
    async ({ params, user }) => {
      const lesson = await prisma.lesson.findFirst({
        where: { id: params.id, module: { isPublished: true } },
        include: { module: { select: { slug: true, title: true } } },
      });
      if (!lesson) throw NotFound('Lesson');
      const progress = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
      });
      return {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        contentMarkdown: lesson.contentMarkdown,
        estimatedMinutes: lesson.estimatedMinutes,
        module: lesson.module,
        completed: Boolean(progress?.completedAt),
      };
    },
  );

  // Mark a lesson complete (idempotent).
  route(
    app,
    {
      method: 'POST',
      url: '/learning/lessons/:id/complete',
      tag: 'Learning',
      summary: 'Mark a lesson complete',
      access: [P.LEARN_READ],
      params: idParamSchema,
    },
    async ({ params, user }) => {
      const lesson = await prisma.lesson.findFirst({
        where: { id: params.id, module: { isPublished: true } },
        select: { id: true },
      });
      if (!lesson) throw NotFound('Lesson');
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
        create: { userId: user.id, lessonId: lesson.id, completedAt: new Date() },
        update: { completedAt: new Date() },
      });
      return { completed: true };
    },
  );

  // Quiz questions for taking it — prompts and options only, no answers.
  route(
    app,
    {
      method: 'GET',
      url: '/learning/quizzes/:id',
      tag: 'Learning',
      summary: 'Quiz questions without answers',
      access: [P.LEARN_READ],
      params: idParamSchema,
    },
    async ({ params }) => {
      const quiz = await prisma.quiz.findFirst({
        where: { id: params.id, module: { isPublished: true } },
        include: { module: { select: { slug: true, title: true } } },
      });
      if (!quiz) throw NotFound('Quiz');
      const questions = quiz.questions as unknown as QuizQuestion[];
      return {
        id: quiz.id,
        title: quiz.title,
        passingScore: quiz.passingScore,
        module: quiz.module,
        questions: questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
      };
    },
  );

  // Submit a quiz: grade server-side, store the result, return score + per-question feedback.
  route(
    app,
    {
      method: 'POST',
      url: '/learning/quizzes/:id/submit',
      tag: 'Learning',
      summary: 'Submit quiz answers and get the graded result',
      access: [P.LEARN_READ],
      params: idParamSchema,
      body: quizSubmitSchema,
    },
    async ({ params, body, user, req }) => {
      const quiz = await prisma.quiz.findFirst({
        where: { id: params.id, module: { isPublished: true } },
      });
      if (!quiz) throw NotFound('Quiz');
      const questions = quiz.questions as unknown as QuizQuestion[];
      let correct = 0;
      const feedback = questions.map((q, i) => {
        const chosen = body.answers[i];
        const ok = chosen === q.answerIndex;
        if (ok) correct++;
        return {
          id: q.id,
          correct: ok,
          answerIndex: q.answerIndex,
          chosen: chosen ?? null,
          explanation: q.explanation,
        };
      });
      const score = Math.round((correct / questions.length) * 100);
      const passed = score >= quiz.passingScore;
      await prisma.quizResult.create({
        data: { quizId: quiz.id, userId: user.id, score, passed, answers: body.answers },
      });
      await audit(
        {
          actorId: user.id,
          action: 'quiz.submit',
          entityType: 'quiz',
          entityId: quiz.id,
          metadata: { score, passed },
        },
        req.log,
      );
      return {
        score,
        passed,
        passingScore: quiz.passingScore,
        correct,
        total: questions.length,
        feedback,
      };
    },
  );
};
