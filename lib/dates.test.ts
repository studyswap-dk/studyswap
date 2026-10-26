import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, formatMessageTime, formatTime } from "./dates";

describe("dates in Danish time", () => {
  it("F10: shows the time in Copenhagen, not in UTC", () => {
    // 12:00 UTC is 14:00 in Copenhagen in October, during summer time.
    expect(formatTime(new Date("2026-10-21T12:00:00Z"))).toBe("14:00");
  });

  it("F10: follows the change from summer to winter time", () => {
    // Summer time ends on 25 October 2026. 12:00 UTC is then 13:00 in Copenhagen.
    expect(formatTime(new Date("2026-10-26T12:00:00Z"))).toBe("13:00");
  });

  it("F10: uses the date in Copenhagen around midnight", () => {
    // 22:30 UTC on 21 October is 00:30 on 22 October in Copenhagen.
    expect(formatDate(new Date("2026-10-21T22:30:00Z"))).toBe("22 Oct 2026");
  });

  it("F2, F12: shows the date and the time together, both in Copenhagen", () => {
    // 22:30 UTC on 21 October is 00:30 on 22 October in Copenhagen, so the date and the
    // time must both move.
    expect(formatDateTime(new Date("2026-10-21T22:30:00Z"))).toBe("22 Oct 2026 at 00:30");
  });
});

describe("formatMessageTime", () => {
  const now = new Date("2026-10-21T18:00:00Z"); // 20:00 in Copenhagen

  it("F10: shows only the time for a message sent today", () => {
    expect(formatMessageTime(new Date("2026-10-21T12:02:00Z"), now)).toBe("14:02");
  });

  it("F10: shows Yesterday for a message sent the day before", () => {
    expect(formatMessageTime(new Date("2026-10-20T12:02:00Z"), now)).toBe("Yesterday 14:02");
  });

  it("F10: shows the date for an older message", () => {
    expect(formatMessageTime(new Date("2026-10-19T12:02:00Z"), now)).toBe("19 Oct 2026 14:02");
  });

  it("F10: counts a message just after midnight in Copenhagen as today", () => {
    const lateNow = new Date("2026-10-21T22:30:00Z"); // 00:30 on 22 October
    expect(formatMessageTime(new Date("2026-10-21T22:10:00Z"), lateNow)).toBe("00:10");
  });

  it("F10: shows Yesterday late on the day summer time ends, which has 25 hours", () => {
    // 22:30 UTC on 25 October is 23:30 in Copenhagen. 24 hours earlier is 00:30 the
    // same day, so counting back 24 hours would never reach 24 October.
    const lateNow = new Date("2026-10-25T22:30:00Z");
    expect(formatMessageTime(new Date("2026-10-24T12:02:00Z"), lateNow)).toBe("Yesterday 14:02");
  });

  it("F10: shows Yesterday across the turn of a month and a year", () => {
    const newYear = new Date("2027-01-01T11:00:00Z");
    expect(formatMessageTime(new Date("2026-12-31T11:00:00Z"), newYear)).toBe("Yesterday 12:00");
  });
});
