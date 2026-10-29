# Learning Docs project: context

Handoff notes from a claude.ai planning chat (Oct 2026). Read this before working in this folder.

## Who I am

- Frontend engineer based in Bangladesh, about 5 years of experience: mainly React/Next.js, about 12 months of Angular, some NestJS.
- Strong in JavaScript. Learning TypeScript in depth now.
- My English is okay but not fluent. Use plain, clear English and explain terms simply.

## My goal

Land a remote, USD-paid role as a **Full-Stack TypeScript Engineer (React/Next.js + NestJS + PostgreSQL) who ships AI features** within 12 months (target: October 2027).

Decisions already made:

- Stack is TypeScript end to end. **Java and Spring Boot are dropped completely; don't suggest them.**
- DSA practice is in TypeScript, about 100 problems at interview level.
- Specialise in AI product engineering (LLM APIs, RAG with pgvector, tool-calling, agents, evaluation). No Python ML.
- Proof over certificates: real deployed projects, blog posts, open-source PRs.
- Time budget: about 13 hours a week alongside my job. Budget for courses and tutors is flexible.

## The 12-month roadmap (summary)

- **Phase 1, Months 1–3 (Nov 2026 – Jan 2027): production backend.** Node.js and REST API design; NestJS in depth (request lifecycle, DI, validation, config, Swagger, logging); PostgreSQL (modelling, indexes, `EXPLAIN ANALYZE`, transactions, locking, migrations); Prisma; auth and security (JWT refresh rotation, OAuth, RBAC, multi-tenancy, OWASP); testing (Jest, Testcontainers, Supertest, Playwright); Redis and BullMQ; Docker; AWS, CI/CD and observability; Stripe; WebSockets; Next.js App Router practice.
- **Phase 2, Months 4–6 (Feb – Apr 2027): AI product engineering.** LLM APIs and the Vercel AI SDK, streaming, structured output with Zod, RAG with pgvector and hybrid search, agents and MCP, evaluation, safety, LLM observability.
- **Phase 3, Months 7–12 (May – Oct 2027): interviews and hiring.** System design, frontend system design, STAR stories, take-homes, live coding, 150+ applications, paid mock interviews.
- **Running throughout:** English (Preply tutor twice a week, shadowing, interview speaking) and the job search (LinkedIn, GitHub, Arc/Turing/Toptal, Wellfound and similar boards; paid via Payoneer, Deel and so on).

Practice projects (real-world; the PDF reader is no longer a portfolio project):

- **Mini-build A:** URL shortener API with analytics, caching and rate limiting
- **Mini-build B:** webhook delivery service with HMAC signatures, retries and a dead-letter queue
- **Project 1:** multi-tenant booking platform ("Calendly for small businesses"): roles, time zones, no double-booking enforced in Postgres, Stripe, reminders, live updates
- **Project 2:** AI customer-support agent for Project 1: RAG over each business's documents, books and reschedules via tool-calling, human handoff, evaluation suite in CI

The full roadmap lives in this site's content (see below) and in the claude.ai doc "12-Month Remote Career Plan".

## This folder: the Learning Docs site

The plan is a Next.js documentation website, built with **Fumadocs**, that collects my notes for every learning topic. The roadmap is the first section.

Current state:

- `learning-docs-content.zip` holds the roadmap as MDX: `content/docs/index.mdx`, `content/docs/meta.json` and `content/docs/roadmap/` (12 pages + `meta.json`).
- `setup.ps1` unzips it, runs `npm create fumadocs-app@latest learning-docs`, copies the content into `learning-docs/content/docs` and starts the dev server.
- The project **is created** in `learning-docs/` (Oct 27, 2026): Next.js 16.4, Fumadocs 16.17, fumadocs-mdx 15.4. `npm run build` passes and `npm run dev` serves all 13 roadmap pages at http://localhost:3000/docs. Don't run `setup.ps1` again: it would overwrite `content/docs`.
- Known harmless build warning: `'highlight' is not recognized as a valid pseudo-element`. It comes from Fumadocs' own CSS, not our content.

Content conventions:

- One MDX page per topic, with `title` and `description` frontmatter (quote values that contain colons).
- Folder order is set in each folder's `meta.json`: `{ "title": "...", "pages": [...] }`.
- Each topic page: plain-English explanation, my own code example, mistakes I made, then a short interview-style answer.
- Planned sections after the roadmap: TypeScript, NestJS, PostgreSQL, AI engineering, system design.
- **Node.js and HTTP** section added (Oct 28, 2026) in `content/docs/node-http/`: 7 lessons (event loop, async patterns, error handling, streams, HTTP basics, REST design, pagination and idempotency keys), a practice project (plain `node:http` booking API + Mini-build A design), solutions and a cheat sheet. Progress: not started. Next after it: NestJS and PostgreSQL.

## TypeScript study (in progress)

- There is a claude.ai doc, "Practical TypeScript for Full-Stack Engineers": 5 lessons (strict mode and `unknown`; narrowing, discriminated unions and `never`; generics and constraints; utility types, `as const` and `satisfies`; Zod and shared API types) plus a capstone. I'll rebuild it as a TypeScript section of this site.
- Its examples still use the PDF reader; switch them to the booking platform when rebuilding.
- Progress: Lesson 1 done. Lesson 2 in progress (exercise 2.1 union type fixed; `describe` function not yet written). Topics explained so far: `never`, constraints, generic components, `as const` and `satisfies`.

## How I like to work

- When I'm practising, give hints and scaffolds first, not full solutions. Review my answers honestly, with a score.
- Keep explanations practical and job-focused; skip type-level puzzles.
- Point out where something is a common interview question, and give a short English answer I can practise saying.
