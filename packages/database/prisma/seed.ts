/**
 * Young Owl seed — dummy data only. No real credentials or personal data.
 * Idempotent: wipes app tables, then recreates everything.
 * Run: pnpm db:seed
 */
import { hash } from '@node-rs/argon2';
import { PrismaClient, type Severity, type Difficulty } from '@prisma/client';
import { ROLE_PERMISSIONS, PERMISSIONS, ROLE_NAMES, renderReportMarkdown } from '@young-owl/shared';

const prisma = new PrismaClient();

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

async function wipe() {
  // Order matters for FKs.
  await prisma.labFlag.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.quizResult.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.learningModule.deleteMany();
  await prisma.report.deleteMany();
  await prisma.vulnerability.deleteMany();
  await prisma.scanResult.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.labSession.deleteMany();
  await prisma.target.deleteMany();
  await prisma.laboratory.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
}

async function main() {
  await wipe();

  // ── RBAC ──
  const permissions = await Promise.all(
    Object.values(PERMISSIONS).map((key) => prisma.permission.create({ data: { key } })),
  );
  const permByKey = new Map(permissions.map((p) => [p.key, p.id]));

  const roles = new Map<string, string>();
  for (const name of ROLE_NAMES) {
    const role = await prisma.role.create({
      data: {
        name,
        description: `${name.toLowerCase()} role`,
        permissions: {
          create: ROLE_PERMISSIONS[name].map((key) => ({ permissionId: permByKey.get(key)! })),
        },
      },
    });
    roles.set(name, role.id);
  }

  // ── Users (dummy) ──
  const pw = (envKey: string, fallback: string) => hash(process.env[envKey] ?? fallback);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@youngowl.lab',
      username: 'owl-admin',
      displayName: 'Owl Administrator',
      passwordHash: await pw('SEED_ADMIN_PASSWORD', 'Owl-Admin-2026!'),
      roleId: roles.get('ADMIN')!,
      lastLoginAt: daysAgo(1),
    },
  });
  const researcher = await prisma.user.create({
    data: {
      email: 'researcher@youngowl.lab',
      username: 'night-researcher',
      displayName: 'Night Researcher',
      passwordHash: await pw('SEED_RESEARCHER_PASSWORD', 'Owl-Research-2026!'),
      roleId: roles.get('RESEARCHER')!,
      lastLoginAt: daysAgo(0),
    },
  });
  const student = await prisma.user.create({
    data: {
      email: 'student@youngowl.lab',
      username: 'owlet',
      displayName: 'Owlet Student',
      passwordHash: await pw('SEED_STUDENT_PASSWORD', 'Owl-Student-2026!'),
      roleId: roles.get('STUDENT')!,
    },
  });

  // ── Labs & targets ──
  const webLab = await prisma.laboratory.create({
    data: {
      name: 'Web Application Basics',
      slug: 'web-basics',
      description: 'OWASP Top 10 practice on deliberately vulnerable web apps.',
      difficulty: 'BEGINNER',
      networkCidr: '172.30.10.0/24',
    },
  });
  const apiLab = await prisma.laboratory.create({
    data: {
      name: 'API Security',
      slug: 'api-security',
      description: 'IDOR, broken auth and SSRF on a dummy REST API.',
      difficulty: 'INTERMEDIATE',
      networkCidr: '172.30.20.0/24',
    },
  });
  const privescLab = await prisma.laboratory.create({
    data: {
      name: 'Linux Privilege Escalation',
      slug: 'linux-privesc',
      description: 'Misconfigured container for privilege escalation practice.',
      difficulty: 'ADVANCED',
      networkCidr: '172.30.30.0/24',
      isActive: false,
    },
  });

  const juice = await prisma.target.create({
    data: {
      laboratoryId: webLab.id,
      name: 'OWASP Juice Shop',
      hostname: 'juice-shop',
      ipAddress: '172.30.10.10',
      baseUrl: 'http://juice-shop:3000',
      appType: 'web',
      technology: 'Node.js / Angular / SQLite',
      difficulty: 'BEGINNER',
      status: 'ONLINE',
      allowsIntrusive: true,
      dockerImage: 'bkimminich/juice-shop:v17.1.1',
    },
  });
  const dvwa = await prisma.target.create({
    data: {
      laboratoryId: webLab.id,
      name: 'DVWA',
      hostname: 'dvwa',
      ipAddress: '172.30.10.11',
      baseUrl: 'http://dvwa',
      appType: 'web',
      technology: 'PHP / MariaDB',
      difficulty: 'BEGINNER',
      status: 'ONLINE',
      allowsIntrusive: true,
      dockerImage: 'vulnerables/web-dvwa:latest',
    },
  });
  const vapi = await prisma.target.create({
    data: {
      laboratoryId: apiLab.id,
      name: 'Owl Bank API (dummy)',
      hostname: 'owl-bank-api',
      ipAddress: '172.30.20.10',
      baseUrl: 'http://owl-bank-api:8080',
      appType: 'api',
      technology: 'Express / PostgreSQL',
      difficulty: 'INTERMEDIATE',
      status: 'OFFLINE',
      dockerImage: 'young-owl/owl-bank-api:dev',
    },
  });
  await prisma.target.create({
    data: {
      laboratoryId: privescLab.id,
      name: 'Rusty Nest (privesc box)',
      hostname: 'rusty-nest',
      ipAddress: '172.30.30.10',
      appType: 'linux-host',
      technology: 'Debian 12, misconfigured sudo + cron',
      difficulty: 'ADVANCED',
      status: 'MAINTENANCE',
      dockerImage: 'young-owl/rusty-nest:dev',
    },
  });

  await prisma.labSession.createMany({
    data: [
      {
        userId: researcher.id,
        laboratoryId: webLab.id,
        status: 'ACTIVE',
        startedAt: daysAgo(0),
        expiresAt: new Date(Date.now() + 2 * 3600e3),
      },
      {
        userId: student.id,
        laboratoryId: webLab.id,
        status: 'EXPIRED',
        startedAt: daysAgo(3),
        expiresAt: daysAgo(3),
        endedAt: daysAgo(3),
      },
    ],
  });

  // ── Assessment history (spread over ~5 months) ──
  type V = {
    title: string;
    category: string;
    cwe: string;
    severity: Severity;
    cvss: number;
    vector: string;
    description: string;
    evidence: string;
    remediation: string;
    status?: 'OPEN' | 'CONFIRMED' | 'REMEDIATED' | 'FALSE_POSITIVE';
  };
  const vulnCatalog: V[] = [
    {
      title: 'SQL injection in login form',
      category: 'A03:2021 Injection',
      cwe: 'CWE-89',
      severity: 'CRITICAL',
      cvss: 9.8,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      description: 'The email parameter of /rest/user/login is concatenated into a SQL query.',
      evidence: "email=' OR 1=1-- returned an admin session token.",
      remediation: 'Use parameterized queries / ORM bindings; add input validation.',
      status: 'CONFIRMED',
    },
    {
      title: 'Reflected XSS in search',
      category: 'A03:2021 Injection',
      cwe: 'CWE-79',
      severity: 'MEDIUM',
      cvss: 6.1,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N',
      description: 'The q parameter is reflected without encoding.',
      evidence: '<iframe src="javascript:alert(1)"> executed in search results.',
      remediation: 'Context-aware output encoding and a strict Content-Security-Policy.',
    },
    {
      title: 'IDOR on basket endpoint',
      category: 'A01:2021 Broken Access Control',
      cwe: 'CWE-639',
      severity: 'HIGH',
      cvss: 7.5,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N',
      description: "GET /rest/basket/{id} returns other users' baskets.",
      evidence: 'Changing id 1 → 2 returned another user basket.',
      remediation: 'Check object ownership on the server for every request.',
    },
    {
      title: 'Missing security headers',
      category: 'A05:2021 Security Misconfiguration',
      cwe: 'CWE-693',
      severity: 'LOW',
      cvss: 3.1,
      vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N',
      description: 'No Content-Security-Policy or Strict-Transport-Security header.',
      evidence: 'nikto: The anti-clickjacking X-Frame-Options header is not present.',
      remediation: 'Add CSP, HSTS, X-Frame-Options/frame-ancestors.',
      status: 'REMEDIATED',
    },
    {
      title: 'Directory listing enabled',
      category: 'A05:2021 Security Misconfiguration',
      cwe: 'CWE-548',
      severity: 'MEDIUM',
      cvss: 5.3,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
      description: '/ftp exposes backup files.',
      evidence: 'gobuster found /ftp (Status: 200) listing package.json.bak.',
      remediation: 'Disable directory listing and remove backups from web root.',
    },
    {
      title: 'Unrestricted file upload',
      category: 'A04:2021 Insecure Design',
      cwe: 'CWE-434',
      severity: 'HIGH',
      cvss: 8.8,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H',
      description: 'Upload accepts .php files that are executed by the server.',
      evidence: 'Uploaded test file in DVWA lab; served from /hackable/uploads/.',
      remediation: 'Allowlist extensions and MIME types, store outside web root, rename files.',
    },
    {
      title: 'Weak password policy',
      category: 'A07:2021 Identification and Authentication Failures',
      cwe: 'CWE-521',
      severity: 'MEDIUM',
      cvss: 5.3,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
      description: 'Accounts can be created with 4-character passwords.',
      evidence: 'Registered account with password "1234".',
      remediation: 'Enforce length ≥ 12 and check against breached-password lists.',
    },
    {
      title: 'Server version disclosure',
      category: 'A05:2021 Security Misconfiguration',
      cwe: 'CWE-200',
      severity: 'INFO',
      cvss: 0,
      vector: '',
      description: 'Server banner reveals Apache/2.4.25 (Debian).',
      evidence: 'nmap -sV: 80/tcp open http Apache httpd 2.4.25',
      remediation: 'Hide version banners (ServerTokens Prod).',
    },
  ];

  const assessmentsPlan: {
    title: string;
    owner: string;
    target: typeof juice;
    daysAgo: number;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'DRAFT';
    vulns: number[];
  }[] = [
    {
      title: 'Juice Shop baseline recon',
      owner: researcher.id,
      target: juice,
      daysAgo: 140,
      status: 'COMPLETED',
      vulns: [7, 3],
    },
    {
      title: 'DVWA OWASP Top 10 sweep',
      owner: researcher.id,
      target: dvwa,
      daysAgo: 110,
      status: 'COMPLETED',
      vulns: [5, 4, 7],
    },
    {
      title: 'Juice Shop injection deep dive',
      owner: researcher.id,
      target: juice,
      daysAgo: 75,
      status: 'COMPLETED',
      vulns: [0, 1],
    },
    {
      title: 'Owl Bank API access control review',
      owner: admin.id,
      target: vapi,
      daysAgo: 45,
      status: 'COMPLETED',
      vulns: [2, 6],
    },
    {
      title: 'Juice Shop retest',
      owner: researcher.id,
      target: juice,
      daysAgo: 12,
      status: 'IN_PROGRESS',
      vulns: [4, 1],
    },
    {
      title: 'Student: first nmap scan',
      owner: student.id,
      target: dvwa,
      daysAgo: 3,
      status: 'DRAFT',
      vulns: [],
    },
  ];

  for (const plan of assessmentsPlan) {
    const start = daysAgo(plan.daysAgo);
    const a = await prisma.assessment.create({
      data: {
        title: plan.title,
        description: `Dummy assessment against ${plan.target.name}.`,
        status: plan.status,
        ownerId: plan.owner,
        laboratoryId: plan.target.laboratoryId,
        targetId: plan.target.id,
        createdAt: start,
        startedAt: plan.status === 'DRAFT' ? null : start,
        completedAt: plan.status === 'COMPLETED' ? daysAgo(plan.daysAgo - 2) : null,
      },
    });
    const scan = await prisma.scanResult.create({
      data: {
        assessmentId: a.id,
        targetId: plan.target.id,
        requestedById: plan.owner,
        toolProfile: 'nmap.service-scan',
        status: plan.status === 'DRAFT' ? 'QUEUED' : 'SUCCEEDED',
        exitCode: plan.status === 'DRAFT' ? null : 0,
        rawOutput:
          plan.status === 'DRAFT'
            ? null
            : `Nmap scan report for ${plan.target.hostname} (${plan.target.ipAddress})\nPORT     STATE SERVICE VERSION\n80/tcp   open  http    Apache httpd 2.4.25\n3000/tcp open  http    Node.js Express`,
        parsed:
          plan.status === 'DRAFT'
            ? undefined
            : {
                ports: [
                  { port: 80, service: 'http', version: 'Apache httpd 2.4.25' },
                  { port: 3000, service: 'http', version: 'Node.js Express' },
                ],
              },
        queuedAt: start,
        startedAt: plan.status === 'DRAFT' ? null : start,
        finishedAt: plan.status === 'DRAFT' ? null : new Date(start.getTime() + 95_000),
      },
    });
    for (const idx of plan.vulns) {
      const v = vulnCatalog[idx]!;
      await prisma.vulnerability.create({
        data: {
          assessmentId: a.id,
          targetId: plan.target.id,
          scanResultId: scan.id,
          title: v.title,
          category: v.category,
          cwe: v.cwe,
          severity: v.severity,
          cvssScore: v.cvss,
          cvssVector: v.vector || null,
          description: v.description,
          evidence: v.evidence,
          remediation: v.remediation,
          status:
            plan.status === 'COMPLETED' && plan.daysAgo > 100 ? 'REMEDIATED' : (v.status ?? 'OPEN'),
          createdAt: start,
        },
      });
    }
    if (plan.status === 'COMPLETED') {
      const full = await prisma.assessment.findUniqueOrThrow({
        where: { id: a.id },
        include: { target: { include: { laboratory: true } }, vulnerabilities: true, owner: true },
      });
      const title = `${plan.title} — report`;
      const generatedAt = daysAgo(plan.daysAgo - 2);
      await prisma.report.create({
        data: {
          assessmentId: a.id,
          authorId: plan.owner,
          title,
          summary: null,
          format: 'MARKDOWN',
          generatedAt,
          content: renderReportMarkdown({
            title,
            generatedAt: generatedAt.toISOString(),
            author: full.owner.displayName,
            assessment: {
              title: full.title,
              status: full.status,
              description: full.description,
              startedAt: full.startedAt?.toISOString() ?? null,
              completedAt: full.completedAt?.toISOString() ?? null,
            },
            target: {
              name: full.target.name,
              hostname: full.target.hostname,
              ipAddress: full.target.ipAddress,
              technology: full.target.technology,
              laboratory: full.target.laboratory.name,
            },
            findings: full.vulnerabilities.map((v) => ({
              ...v,
              cvssScore: v.cvssScore === null ? null : Number(v.cvssScore),
            })),
          }),
        },
      });
    }
  }

  // ── Learning center (spec §4 modules A–I) ──
  const modules: {
    slug: string;
    title: string;
    category: string;
    difficulty: Difficulty;
    description: string;
    lessons: string[];
  }[] = [
    {
      slug: 'reconnaissance',
      title: 'Reconnaissance',
      category: 'C',
      difficulty: 'BEGINNER',
      description: 'Network discovery, port scanning, service and DNS enumeration, fingerprinting.',
      lessons: [
        'Network discovery',
        'Port scanning with Nmap',
        'Service enumeration',
        'DNS & subdomain enumeration',
        'Technology fingerprinting',
      ],
    },
    {
      slug: 'vulnerability-assessment',
      title: 'Vulnerability Assessment',
      category: 'D',
      difficulty: 'BEGINNER',
      description:
        'OWASP Top 10: SQLi, XSS, IDOR, CSRF, SSRF, auth flaws, misconfiguration, uploads.',
      lessons: [
        'SQL injection',
        'Cross-site scripting',
        'IDOR',
        'CSRF',
        'SSRF',
        'File upload vulnerabilities',
      ],
    },
    {
      slug: 'exploitation-lab',
      title: 'Exploitation Laboratory',
      category: 'E',
      difficulty: 'INTERMEDIATE',
      description: 'Guided, isolated exercises against the lab targets.',
      lessons: [
        'SQLi on the dummy database',
        'XSS on Juice Shop',
        'Authentication bypass in the lab',
        'Container privilege escalation',
      ],
    },
    {
      slug: 'backdoor-persistence',
      title: 'Backdoor & Persistence (Detection)',
      category: 'F',
      difficulty: 'ADVANCED',
      description:
        'Concepts and architecture of backdoors and persistence, and how to detect and remove them.',
      lessons: [
        'What a backdoor is (concepts)',
        'Reverse vs bind shells (conceptual)',
        'Persistence mechanisms: cron, systemd, startup',
        'C2 architecture overview',
        'Hunting and removing unauthorized persistence',
      ],
    },
    {
      slug: 'evasion-detection',
      title: 'Evasion & Exit (Detection Engineering)',
      category: 'G',
      difficulty: 'ADVANCED',
      description: 'Defense-evasion and exfiltration as threat patterns, from the defender side.',
      lessons: [
        'Defense evasion concepts',
        'Spotting log tampering',
        'Anti-forensics indicators',
        'Exfiltration indicators in traffic',
        'Writing detection rules',
      ],
    },
    {
      slug: 'incident-response',
      title: 'Incident Response & Forensics',
      category: 'G',
      difficulty: 'INTERMEDIATE',
      description: 'Triage, evidence handling, timeline building.',
      lessons: ['IR lifecycle', 'Evidence collection', 'Timeline analysis'],
    },
    {
      slug: 'reporting',
      title: 'Writing Security Reports',
      category: 'H',
      difficulty: 'BEGINNER',
      description: 'Severity, CVSS, evidence and remediation write-ups.',
      lessons: ['CVSS 3.1 basics', 'Writing a finding'],
    },
  ];

  let order = 0;
  const allLessonIds: string[] = [];
  const quizIds: string[] = [];
  for (const m of modules) {
    const mod = await prisma.learningModule.create({
      data: {
        slug: m.slug,
        title: m.title,
        description: m.description,
        category: m.category,
        difficulty: m.difficulty,
        order: order++,
        isPublished: true,
        lessons: {
          create: m.lessons.map((t, i) => ({
            slug: t
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, ''),
            title: t,
            order: i,
            estimatedMinutes: 10 + i * 5,
            contentMarkdown: `# ${t}\n\nLesson content for **${m.title}** — written in Phase 4.\n`,
          })),
        },
        quizzes: {
          create: [
            {
              title: `${m.title} quiz`,
              questions: [
                {
                  id: 'q1',
                  prompt: `Placeholder question 1 for ${m.title}`,
                  options: ['A', 'B', 'C', 'D'],
                  answerIndex: 0,
                  explanation: 'Written in Phase 4.',
                },
                {
                  id: 'q2',
                  prompt: `Placeholder question 2 for ${m.title}`,
                  options: ['A', 'B', 'C', 'D'],
                  answerIndex: 2,
                  explanation: 'Written in Phase 4.',
                },
              ],
            },
          ],
        },
      },
      include: { lessons: true, quizzes: true },
    });
    allLessonIds.push(...mod.lessons.map((l) => l.id));
    quizIds.push(...mod.quizzes.map((q) => q.id));
  }

  // Progress: researcher finished 14 lessons, student 4.
  await prisma.lessonProgress.createMany({
    data: [
      ...allLessonIds.slice(0, 14).map((lessonId, i) => ({
        userId: researcher.id,
        lessonId,
        completedAt: daysAgo(60 - i * 3),
      })),
      ...allLessonIds
        .slice(0, 4)
        .map((lessonId, i) => ({ userId: student.id, lessonId, completedAt: daysAgo(5 - i) })),
    ],
  });
  await prisma.quizResult.createMany({
    data: [
      {
        quizId: quizIds[0]!,
        userId: researcher.id,
        score: 100,
        passed: true,
        answers: [0, 2],
        submittedAt: daysAgo(50),
      },
      {
        quizId: quizIds[1]!,
        userId: researcher.id,
        score: 50,
        passed: false,
        answers: [0, 1],
        submittedAt: daysAgo(30),
      },
      {
        quizId: quizIds[0]!,
        userId: student.id,
        score: 100,
        passed: true,
        answers: [0, 2],
        submittedAt: daysAgo(2),
      },
    ],
  });

  // ── Audit trail ──
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: 'lab.create',
        entityType: 'laboratory',
        entityId: webLab.id,
        createdAt: daysAgo(150),
      },
      {
        actorId: admin.id,
        action: 'target.create',
        entityType: 'target',
        entityId: juice.id,
        createdAt: daysAgo(150),
      },
      {
        actorId: researcher.id,
        action: 'assessment.create',
        entityType: 'assessment',
        createdAt: daysAgo(12),
      },
      {
        actorId: researcher.id,
        action: 'job.create',
        entityType: 'scan_result',
        metadata: { toolProfile: 'nmap.service-scan' },
        createdAt: daysAgo(12),
      },
      { actorId: student.id, action: 'quiz.submit', entityType: 'quiz', createdAt: daysAgo(2) },
      { actorId: researcher.id, action: 'auth.login', createdAt: daysAgo(0) },
    ],
  });

  // ── Lab mode extras (only for the intentionally vulnerable copy) ──
  if (process.env.SEED_VULN === 'true') {
    // Weak password from common wordlists, for brute-force practice.
    await prisma.user.create({
      data: {
        email: 'intern@youngowl.lab',
        username: 'summer-intern',
        displayName: 'Summer Intern',
        passwordHash: await hash(process.env.SEED_INTERN_PASSWORD ?? 'sunshine'),
        roleId: roles.get('STUDENT')!,
      },
    });
    await prisma.labFlag.createMany({
      data: [
        {
          name: 'sqli',
          value: process.env.FLAG_SQLI ?? 'YO{un10n_s3l3ct_th3_0wl}',
          hint: 'Found by reading tables you were never meant to see.',
        },
      ],
    });
    // A private admin assessment that only an IDOR can reveal.
    await prisma.assessment.create({
      data: {
        title: 'Internal: red team notes (private)',
        description: `Do not share. Break-glass code: ${process.env.FLAG_IDOR ?? 'YO{1d0r_m34ns_n0_0wn3r_ch3ck}'}`,
        status: 'DRAFT',
        ownerId: admin.id,
        laboratoryId: webLab.id,
        targetId: juice.id,
      },
    });
    console.log('Lab mode extras seeded (intern account, flags, private assessment).');
  }

  console.log('Seed complete:');
  console.log('  admin@youngowl.lab       (ADMIN)');
  console.log('  researcher@youngowl.lab  (RESEARCHER)');
  console.log('  student@youngowl.lab     (STUDENT)');
  console.log('  Passwords come from SEED_*_PASSWORD in .env');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
