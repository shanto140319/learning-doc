'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// Where the last-read position lives:
// - the server (/api/last-read, SQLite): survives clearing the browser, shared by every browser on this server
// - localStorage: an instant local copy, so the card shows without waiting for the network
// The newer of the two (by savedAt) wins.

const STORAGE_KEY = 'learning-docs:last-read';
// Set when "Continue reading" is clicked, so the next page knows where to scroll.
const RESUME_KEY = 'learning-docs:resume';
const API_URL = '/api/last-read';

type LastRead = {
  url: string;
  title: string;
  scrollY: number;
  savedAt: number;
};

type Resume = { url: string; scrollY: number };

// localStorage and the API can hold anything (old formats, manual edits), so check the shape.
function isLastRead(value: unknown): value is LastRead {
  return (
    typeof value === 'object' && value !== null &&
    'url' in value && typeof value.url === 'string' &&
    'title' in value && typeof value.title === 'string' &&
    'scrollY' in value && typeof value.scrollY === 'number' &&
    'savedAt' in value && typeof value.savedAt === 'number'
  );
}

function isResume(value: unknown): value is Resume {
  return (
    typeof value === 'object' && value !== null &&
    'url' in value && typeof value.url === 'string' &&
    'scrollY' in value && typeof value.scrollY === 'number'
  );
}

function readLocal(): LastRead | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLastRead(parsed) ? parsed : null;
  } catch {
    return null; // storage blocked or invalid JSON
  }
}

function writeLocal(value: LastRead) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // storage blocked or full: the server copy still works
  }
}

async function fetchFromServer(): Promise<LastRead | null> {
  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const data = typeof body === 'object' && body !== null && 'data' in body ? body.data : null;
    return isLastRead(data) ? data : null;
  } catch {
    return null; // offline or server down: fall back to the local copy
  }
}

function saveToServer(value: Omit<LastRead, 'savedAt'>, keepalive = false) {
  // keepalive lets the request finish even when the tab is closing
  void fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: value.url, title: value.title, scrollY: value.scrollY }),
    keepalive,
  }).catch(() => {
    // offline: the local copy is still saved; the next scroll will try again
  });
}

function takeResume(url: string): Resume | null {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    if (raw === null) return null;
    sessionStorage.removeItem(RESUME_KEY);
    const parsed: unknown = JSON.parse(raw);
    return isResume(parsed) && parsed.url === url ? parsed : null;
  } catch {
    return null; // sessionStorage blocked or old format: just don't restore
  }
}

/** Saves the current page and scroll position, locally and on the server. Renders nothing. */
export function LastReadTracker({ url, title }: { url: string; title: string }) {
  useEffect(() => {
    let lastSentScrollY: number | null = null;

    const current = (): LastRead => ({ url, title, scrollY: Math.round(window.scrollY), savedAt: Date.now() });

    const saveLocal = () => writeLocal(current());
    const sendToServer = (keepalive = false) => {
      const value = current();
      if (value.scrollY === lastSentScrollY) return; // nothing changed since the last save
      lastSentScrollY = value.scrollY;
      saveToServer(value, keepalive);
    };

    let restoreTimer: number | undefined;
    const resume = takeResume(url);
    if (resume) {
      // Wait a moment so Next.js finishes its own scroll-to-top first.
      restoreTimer = window.setTimeout(() => window.scrollTo({ top: resume.scrollY }), 100);
    } else {
      saveLocal();
      sendToServer();
    }

    // Local saves are cheap: 200 ms after scrolling stops. Server saves: 1.5 s, to send fewer requests.
    let localTimer: number | undefined;
    let serverTimer: number | undefined;
    const onScroll = () => {
      window.clearTimeout(localTimer);
      window.clearTimeout(serverTimer);
      localTimer = window.setTimeout(saveLocal, 200);
      serverTimer = window.setTimeout(() => sendToServer(), 1500);
    };

    // Closing or hiding the tab: send the latest position right away.
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        saveLocal();
        sendToServer(true);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onHide);

    return () => {
      // Leaving the page inside the app (client-side navigation): flush the pending save.
      if (serverTimer !== undefined) sendToServer(true);
      window.clearTimeout(restoreTimer);
      window.clearTimeout(localTimer);
      window.clearTimeout(serverTimer);
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

/** "Continue reading" card. Shows nothing until a page has been read. */
export function ContinueReading() {
  const [lastRead, setLastRead] = useState<LastRead | null>(null);

  // Read after mount: localStorage doesn't exist during server rendering.
  useEffect(() => {
    let cancelled = false;
    const local = readLocal();
    setLastRead(local); // show the local copy immediately

    void fetchFromServer().then((server) => {
      if (cancelled || server === null) return;
      if (local === null || server.savedAt > local.savedAt) {
        setLastRead(server);
        writeLocal(server); // keep the local copy up to date
      }
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
        try {
          const resume: Resume = { url: lastRead.url, scrollY: lastRead.scrollY };
          sessionStorage.setItem(RESUME_KEY, JSON.stringify(resume));
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
