'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// The last-read position lives only on the server (/api/last-read, SQLite).
// No localStorage: one source of truth, shared by every browser on this server.

const API_URL = '/api/last-read';
// Old versions kept a copy here. Removed once on load so stale data doesn't linger.
const OLD_STORAGE_KEY = 'learning-docs:last-read';

type LastRead = {
  url: string;
  title: string;
  scrollY: number;
  savedAt: number;
};

// The API can return anything (old formats, manual DB edits), so check the shape.
function isLastRead(value: unknown): value is LastRead {
  return (
    typeof value === 'object' && value !== null &&
    'url' in value && typeof value.url === 'string' &&
    'title' in value && typeof value.title === 'string' &&
    'scrollY' in value && typeof value.scrollY === 'number' &&
    'savedAt' in value && typeof value.savedAt === 'number'
  );
}

async function fetchLastRead(): Promise<LastRead | null> {
  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const data = typeof body === 'object' && body !== null && 'data' in body ? body.data : null;
    return isLastRead(data) ? data : null;
  } catch {
    return null; // offline or server down: show no card
  }
}

function saveLastRead(value: { url: string; title: string; scrollY: number }, keepalive = false) {
  // keepalive lets the request finish even when the tab is closing
  void fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
    keepalive,
  }).catch(() => {
    // offline: the next scroll will try again
  });
}

function removeOldLocalCopy() {
  try {
    localStorage.removeItem(OLD_STORAGE_KEY);
  } catch {
    // storage blocked: nothing to remove
  }
}

// Set when "Continue reading" is clicked, read once by the next page so it can scroll.
// A module variable is enough: Link navigation keeps the same JavaScript in memory.
let pendingResume: { url: string; scrollY: number } | null = null;

function takeResume(url: string): number | null {
  const resume = pendingResume;
  pendingResume = null;
  return resume !== null && resume.url === url ? resume.scrollY : null;
}

/** Saves the current page and scroll position to the server. Renders nothing. */
export function LastReadTracker({ url, title }: { url: string; title: string }) {
  useEffect(() => {
    let lastSentScrollY: number | null = null;

    const send = (keepalive = false) => {
      const scrollY = Math.round(window.scrollY);
      if (scrollY === lastSentScrollY) return; // nothing changed since the last save
      lastSentScrollY = scrollY;
      saveLastRead({ url, title, scrollY }, keepalive);
    };

    let restoreTimer: number | undefined;
    const resumeY = takeResume(url);
    if (resumeY !== null) {
      // Wait a moment so Next.js finishes its own scroll-to-top first.
      restoreTimer = window.setTimeout(() => window.scrollTo({ top: resumeY }), 100);
    } else {
      send();
    }

    // Save 1 s after scrolling stops, so we send few requests.
    let saveTimer: number | undefined;
    const onScroll = () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        saveTimer = undefined;
        send();
      }, 1000);
    };

    // Closing or hiding the tab: send the latest position right away.
    const onHide = () => {
      if (document.visibilityState === 'hidden') send(true);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onHide);

    return () => {
      // Leaving the page inside the app (client-side navigation): flush the pending save.
      if (saveTimer !== undefined) send(true);
      window.clearTimeout(restoreTimer);
      window.clearTimeout(saveTimer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onHide);
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

/** "Continue reading" card. Shows nothing until the server has a saved page. */
export function ContinueReading() {
  const [lastRead, setLastRead] = useState<LastRead | null>(null);

  useEffect(() => {
    let cancelled = false;
    removeOldLocalCopy();

    void fetchLastRead().then((data) => {
      if (!cancelled) setLastRead(data);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (lastRead === null) return null;

  return (
    <Link
      href={lastRead.url}
      onClick={() => {
        pendingResume = { url: lastRead.url, scrollY: lastRead.scrollY };
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
