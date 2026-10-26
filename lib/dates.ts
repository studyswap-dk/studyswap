// Dates and times as students in Denmark read them. The server runs in UTC, so the
// time zone is always given; without it, a message sent at 14:00 in Copenhagen would
// show as 12:00. The same functions run on the server and in the browser, so the
// text is identical on both and React does not warn about a mismatch.
const TIME_ZONE = "Europe/Copenhagen";
const LOCALE = "en-GB";

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "21 Oct 2026"
export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

// "14:02"
export function formatTime(date: Date): string {
  return timeFormat.format(date);
}

// "21 Oct 2026 at 14:02", for a moment that is shown on its own and not in a list of
// messages, where formatMessageTime() is shorter.
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

// The calendar day in Copenhagen, "2026-10-21", for comparing two moments.
function dayKey(date: Date): string {
  return dayKeyFormat.format(date);
}

// The calendar day before a day key. Counted on the calendar and not as 24 hours back,
// because the day summer time ends has 25 hours.
function previousDayKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

// When a message was sent, as short as it can be without being unclear: only the time
// today, "Yesterday" and the time yesterday, otherwise the date and the time.
export function formatMessageTime(date: Date, now: Date): string {
  const time = formatTime(date);
  const today = dayKey(now);
  if (dayKey(date) === today) return time;
  if (dayKey(date) === previousDayKey(today)) return `Yesterday ${time}`;
  return `${formatDate(date)} ${time}`;
}
