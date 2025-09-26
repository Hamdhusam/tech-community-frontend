"use client";
import { useEffect, useMemo, useState } from "react";

export function useCountdown(targetHour = 22, targetMinute = 0) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = useMemo(() => {
    const d = new Date();
    d.setHours(targetHour, targetMinute, 0, 0);
    if (d.getTime() <= now.getTime()) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }, [now, targetHour, targetMinute]);

  const diff = target.getTime() - now.getTime();
  const overdue = diff <= 0;
  const hours = Math.max(0, Math.floor(diff / 1000 / 60 / 60));
  const minutes = Math.max(0, Math.floor((diff / 1000 / 60) % 60));
  const seconds = Math.max(0, Math.floor((diff / 1000) % 60));

  return { hours, minutes, seconds, overdue, target };
}