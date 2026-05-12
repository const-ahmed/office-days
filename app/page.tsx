"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

type DemoStatus = "PLANNED" | "DONE";
type DemoRow = { day: string; status: DemoStatus };

const STEPS = [
  "Click any day to mark it as Planned",
  "Click it again to mark it as Done",
  "Click once more to clear it",
  "Change your required days target in the box below",
];

export default function Home() {
  const [today] = useState(new Date());
  const [cursor, setCursor] = useState(startOfMonth(today));
  const [rows, setRows] = useState<DemoRow[]>([]);
  const [required, setRequired] = useState(9);
  const [reqInput, setReqInput] = useState("9");
  const [hintStep, setHintStep] = useState(0);

  const monthLabel = format(cursor, "MMMM yyyy");

  const gridDays = useMemo(() => {
    const ms = startOfMonth(cursor);
    const me = endOfMonth(cursor);
    return eachDayOfInterval({
      start: startOfWeek(ms, { weekStartsOn: 1 }),
      end: endOfWeek(me, { weekStartsOn: 1 }),
    });
  }, [cursor]);

  const getRow = (d: Date) =>
    rows.find((r) => r.day === format(d, "yyyy-MM-dd"));

  const cycle = (d: Date) => {
    const key = format(d, "yyyy-MM-dd");
    const existing = rows.find((r) => r.day === key);
    if (!existing) {
      setRows((prev) => [...prev, { day: key, status: "PLANNED" }]);
      setHintStep((s) => Math.min(s + 1, STEPS.length - 1));
    } else if (existing.status === "PLANNED") {
      setRows((prev) =>
        prev.map((r) => (r.day === key ? { ...r, status: "DONE" } : r)),
      );
      setHintStep((s) => Math.min(s + 1, STEPS.length - 1));
    } else {
      setRows((prev) => prev.filter((r) => r.day !== key));
    }
  };

  const planned = rows.filter((r) => r.status === "PLANNED").length;
  const done = rows.filter((r) => r.status === "DONE").length;
  const remaining = Math.max(0, required - done);
  const progressPct = Math.min(
    100,
    Math.round((done / Math.max(1, required)) * 100),
  );

  return (
    <main className="min-h-screen pb-24">
      {/* sticky CTA banner */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-3 bg-primary text-primary-foreground shadow-md">
        <p className="text-sm font-medium">
          You&apos;re in demo mode. Sign in to save your progress
        </p>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="secondary" asChild>
            <Link href="/auth/signin">Sign in</Link>
          </Button>
          <Button
            size="sm"
            className="bg-white text-primary hover:bg-white/90"
            asChild
          >
            <Link href="/auth/signup">Create account</Link>
          </Button>
        </div>
      </div>

      <div className="p-4 mx-auto max-w-3xl space-y-4 mt-4">
        {/* hint strip */}
        <div className="rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-card">
            <div className="flex gap-1.5 shrink-0">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
                  style={{
                    background:
                      i <= hintStep
                        ? "var(--primary)"
                        : "var(--muted-foreground)",
                    opacity: i <= hintStep ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={hintStep}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-muted-foreground"
              >
                {STEPS[hintStep]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* header */}
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCursor(subMonths(cursor, 1))}
            >
              ←
            </Button>
            <motion.h1
              key={monthLabel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-semibold"
            >
              {monthLabel}
            </motion.h1>
            <Button
              variant="outline"
              onClick={() => setCursor(addMonths(cursor, 1))}
            >
              →
            </Button>
          </div>

          {/* inline required days setter */}
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const val = Math.max(
                0,
                Math.min(31, Math.floor(Number(reqInput))),
              );
              setRequired(val);
              setReqInput(String(val));
              setHintStep(STEPS.length - 1);
            }}
          >
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              Required days
            </label>
            <input
              type="number"
              min={0}
              max={31}
              value={reqInput}
              onChange={(e) => setReqInput(e.target.value)}
              className="border rounded px-2 py-1 w-16 text-sm"
            />
            <Button size="sm" type="submit" variant="outline">
              Set
            </Button>
          </form>
        </header>

        {/* badges + progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">Required: {required}</Badge>
              <Badge className="bg-green-600 text-white hover:opacity-90">
                Done: {done}
              </Badge>
              <Badge>Planned: {planned}</Badge>
              <Badge variant="destructive">Remaining: {remaining}</Badge>
            </div>
            <div className="mt-3">
              <Progress value={progressPct} />
              <p className="text-xs text-muted-foreground mt-1">
                {progressPct}% of target reached
              </p>
            </div>
          </CardContent>
        </Card>

        {/* calendar */}
        <Card>
          <CardContent className="p-2 md:p-4">
            <div className="grid grid-cols-7 gap-1 text-xs md:text-sm text-muted-foreground px-1 md:px-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-2">
              {gridDays.map((d) => {
                const inMonth = isSameMonth(d, cursor);
                const r = getRow(d);
                const isToday = isSameDay(d, today);
                const base =
                  "aspect-square rounded-md text-sm flex flex-col items-center justify-center select-none";
                const tone = inMonth
                  ? "bg-card border hover:bg-accent"
                  : "bg-muted/30 text-muted-foreground";
                const ring = isToday ? "ring-2 ring-primary" : "border";
                return (
                  <motion.button
                    key={d.toISOString()}
                    whileTap={{ scale: 0.96 }}
                    className={`${base} ${tone} ${ring}`}
                    onClick={() => inMonth && cycle(d)}
                    disabled={!inMonth}
                    aria-label={`Toggle ${format(d, "PP")}`}
                  >
                    <div className="text-xs md:text-sm">{format(d, "d")}</div>
                    {r?.status === "PLANNED" && (
                      <span className="mt-1 text-[10px] md:text-xs rounded px-1 py-0.5 bg-yellow-500/20 text-yellow-800">
                        Planned
                      </span>
                    )}
                    {r?.status === "DONE" && (
                      <span className="mt-1 text-[10px] md:text-xs rounded px-1 py-0.5 bg-green-500/20 text-green-700">
                        Done
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3 px-1">
              Tap to cycle: none → planned → done → none
            </p>
          </CardContent>
        </Card>

        {/* bottom CTA */}
        <Card>
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Ready to track for real?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create a free account to save your office days across months.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button asChild variant="outline">
                <Link href="/auth/signin">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Create account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
