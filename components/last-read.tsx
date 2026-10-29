'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'learning-docs:last-read';
// Set when "Continue reading" is clicked, so the next page knows to restore the scroll position.
const RESUME_KEY = 'learning-docs:resume';

type LastRead = {
  url: string;
  title: string;
  scrollY: number;
  savedAt: number;
};

// localStorage can hold anything (old formats, manual edits), so check the shape.
function isLastRead(value: unknown): value is LastRead {
  return (
    typeof value === 'object' && value !== null &&
    'url' in value && typeof value.url === 'string' &&
    'title' in value && typeof value.title === 'string' &&
    'scrollY' in value && typeof value.scrollY === 'number' &&
    'savedAt' in value && typeof value.savedAt === 'number'
  );
}

function readLastRead(): LastRead | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLastRead(parsed) ? parsed : null;
  } catch {
    return null; // storage blocked or invalid JSON
  }
}

function writeLastRead(value: LastRead) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // storage blocked or full: nothing to do
  }
}

/** Saves the current page and scroll position. Renders nothing. */
export function LastReadTracker({ url, title }: { url: string; title: string }) {
  useEffect(() => {
    const save = () =>
      writeLastRead({ url, title, scrollY: Math.round(window.scrollY), savedAt: Date.now() });

    let restoreTimer: number | undefined;
    const previous = readLastRead();
    let shouldResume = false;
    try {
      shouldResume = sessionStorage.getItem(RESUME_KEY) === url && previous?.url === url;
      if (shouldResume) sessionStorage.removeItem(RESUME_KEY);
    } catch {
      // sessionStorage blocked: just don't restore
    }

    if (shouldResume && previous) {
      // Wait a moment so Next.js finishes its own scroll-to-top first.
      restoreTimer = window.setTimeout(() => window.scrollTo({ top: previous.scrollY }), 100);
    } else {
      save();
    }

    let saveTimer: number | undefined;
    const onScroll = () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(save, 200);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.clearTimeout(restoreTimer);
      window.clearTimeout(saveTimer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [url, title]);

  return null;
}

function timeAgo(savedAt: number): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minutes = Math.round((Date.now() - savedAt) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
}

/** "Continue reading" card. Shows nothing until a page has been read. */
export function ContinueReading() {
  const [lastRead, setLastRead] = useState<LastRead | null>(null);

  // Read after mount: localStorage doesn't exist during server rendering.
  useEffect(() => {
    setLastRead(readLastRead());
  }, []);

  if (lastRead === null) return null;

  return (
    <Link
      href={lastRead.url}
      onClick={() => {
        try {
          sessionStorage.setItem(RESUME_KEY, lastRead.url);
        } catch {
          // ignore: the link still works, just without scroll restore
        }
      }}
      className="not-prose mb-6 flex items-center justify-between gap-4 rounded-xl border bg-fd-card p-4 text-start no-underline transition-colors hover:bg-fd-accent"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-fd-muted-foreground">
          Continue reading · {timeAgo(lastRead.savedAt)}
        </p>
        <p className="truncate font-semibold text-fd-foreground">{lastRead.title}</p>
      </div>
      <span aria-hidden className="shrink-0 text-fd-primary">→</span>
    </Link>
  );
}
