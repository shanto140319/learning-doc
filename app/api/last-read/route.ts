import { getLastRead, saveLastRead, type LastRead } from '@/lib/last-read-db';

// GET  /api/last-read → 200 { data: LastRead | null }
// PUT  /api/last-read → 200 { data: LastRead }   (replaces the saved position; safe to retry)
// Errors use the problem+json format from the Node.js and HTTP section (Lesson 6).

const MAX_BODY_BYTES = 2_000;

function problem(status: number, type: string, title: string, errors?: { field: string; message: string }[]) {
  return Response.json(
    { type, title, status, instance: '/api/last-read', ...(errors ? { errors } : {}) },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

export function GET() {
  return Response.json({ data: getLastRead() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return problem(415, 'unsupported-media-type', 'Send JSON with Content-Type: application/json');
  }

  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    return problem(413, 'payload-too-large', `Body must be at most ${MAX_BODY_BYTES} bytes`);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return problem(400, 'invalid-json', 'Body is not valid JSON');
  }

  const result = validate(body);
  if ('errors' in result) {
    return problem(422, 'validation-failed', 'Your request has invalid fields', result.errors);
  }
  return Response.json({ data: saveLastRead(result.value) });
}

type FieldError = { field: string; message: string };

function validate(body: unknown): { value: Omit<LastRead, 'savedAt'> } | { errors: FieldError[] } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { errors: [{ field: '', message: 'Body must be a JSON object' }] };
  }
  const { url, title, scrollY } = body as Record<string, unknown>;
  const errors: FieldError[] = [];

  // Only docs pages, and only same-site paths (no "https://evil.example" or "//evil.example").
  if (typeof url !== 'string' || !/^\/docs(\/[\w\-/]*)?$/.test(url) || url.length > 300) {
    errors.push({ field: 'url', message: 'url must be a docs path like /docs/nestjs/lesson-1-first-app' });
  }
  if (typeof title !== 'string' || title.trim() === '' || title.length > 200) {
    errors.push({ field: 'title', message: 'title must be a non-empty string of at most 200 characters' });
  }
  if (typeof scrollY !== 'number' || !Number.isInteger(scrollY) || scrollY < 0 || scrollY > 10_000_000) {
    errors.push({ field: 'scrollY', message: 'scrollY must be an integer between 0 and 10,000,000' });
  }

  if (errors.length > 0) return { errors };
  return { value: { url: url as string, title: (title as string).trim(), scrollY: scrollY as number } };
}
