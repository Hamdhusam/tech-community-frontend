"use client";
import { useEffect, useMemo, useState } from "react";

export function useCountdown(targetHour = 22, targetMinute = 0, timeZone?: string, options?: { rollToNextDay?: boolean }) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = useMemo(() => {
    const rollToNextDay = options?.rollToNextDay ?? true;
    // If a timezone is provided and it's IST, compute target based on Asia/Kolkata regardless of user's local TZ
    if (timeZone === "Asia/Kolkata") {
      // Get current date in IST using Intl
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
        .formatToParts(now)
        .reduce<Record<string, string>>((acc, p) => {
          if (p.type !== "literal") acc[p.type] = p.value;
          return acc;
        }, {});

      const year = Number(parts.year);
      const month = Number(parts.month); // 1-12
      const day = Number(parts.day);

      // IST is UTC+05:30
      const istOffsetMinutes = 5 * 60 + 30;
      // Construct the target as targetHour:targetMinute:00 IST for "today" in IST
      const targetUtcMs = Date.UTC(year, month - 1, day, targetHour, targetMinute, 0, 0) - istOffsetMinutes * 60 * 1000;
      let d = new Date(targetUtcMs);

      if (rollToNextDay && d.getTime() <= now.getTime()) {
        // Move to next day in IST
        const nextDayUtcMs = Date.UTC(year, month - 1, day + 1, targetHour, targetMinute, 0, 0) - istOffsetMinutes * 60 * 1000;
        d = new Date(nextDayUtcMs);
      }
      return d;
    }

    // Fallback: local timezone countdown
    const d = new Date();
    d.setHours(targetHour, targetMinute, 0, 0);
    if (rollToNextDay && d.getTime() <= now.getTime()) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }, [now, targetHour, targetMinute, timeZone, options?.rollToNextDay]);

  const diff = target.getTime() - now.getTime();
  const overdue = diff <= 0;
  const hours = Math.max(0, Math.floor(diff / 1000 / 60 / 60));
  const minutes = Math.max(0, Math.floor((diff / 1000 / 60) % 60));
  const seconds = Math.max(0, Math.floor((diff / 1000) % 60));

  return { hours, minutes, seconds, overdue, target };
}