"use client";

import { useEffect, useMemo, useState } from "react";
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
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

// minimal shape I care about
type OfficeRow = { id: string; day: string; status: "PLANNED" | "DONE" };

export default function AppPage() {
  const s = supabase();

  const [today] = useState(new Date());
  const [cursor, setCursor] = useState(startOfMonth(today));
  const [required, setRequired] = useState<number>(9);
  const [rows, setRows] = useState<OfficeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const monthLabel = format(cursor, "MMMM yyyy");

  // full grid (Mon..Sun)
  const gridDays = useMemo(() => {
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  // load user settings + month data
  const load = async () => {
    setLoading(true);
    const { data: setts } = await s
      .from("user_settings")
      .select("monthly_required_days")
      .maybeSingle();
    if (setts?.monthly_required_days != null)
      setRequired(setts.monthly_required_days);

    const from = format(monthStart, "yyyy-MM-dd");
    const to = format(monthEnd, "yyyy-MM-dd");
    const { data: days } = await s
      .from("office_days")
      .select("id, day, status")
      .gte("day", from)
      .lte("day", to)
      .order("day", { ascending: true });

    setRows((days ?? []) as OfficeRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [cursor]);

  const planned = rows.filter((r) => r.status === "PLANNED").length;
  const done = rows.filter((r) => r.status === "DONE").length;
  const remaining = Math.max(0, required - done);
  const progressPct = Math.min(
    100,
    Math.round((done / Math.max(1, required)) * 100)
  );

  const getRowFor = (d: Date) =>
    rows.find((r) => r.day === format(d, "yyyy-MM-dd"));

  // insert/update/delete unified
  const setStatus = async (d: Date, next: "PLANNED" | "DONE" | "NONE") => {
    const key = format(d, "yyyy-MM-dd");
    const existing = rows.find((r) => r.day === key);

    if (next === "NONE") {
      if (!existing) return;
      await s.from("office_days").delete().eq("id", existing.id);
      setRows((prev) => prev.filter((p) => p.id !== existing.id));
      return;
    }

    if (!existing) {
      const { data } = await s
        .from("office_days")
        .insert({ day: key, status: next })
        .select("id, day, status")
        .single();
      if (data) setRows((prev) => [...prev, data as OfficeRow]);
      return;
    }

    const { data } = await s
      .from("office_days")
      .update({ status: next })
      .eq("id", existing.id)
      .select("id, day, status")
      .single();
    if (data)
      setRows((prev) =>
        prev.map((p) => (p.id === existing.id ? (data as OfficeRow) : p))
      );
  };

  // tap cycle: none → planned → done → none
  const cycle = async (d: Date) => {
    const r = getRowFor(d);
    if (!r) return setStatus(d, "PLANNED");
    if (r.status === "PLANNED") return setStatus(d, "DONE");
    return setStatus(d, "NONE");
  };

  return (
    <div className="p-4 mx-auto max-w-3xl space-y-4">
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Settings</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <form
                className="flex items-center gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget as HTMLFormElement);
                  const val = Number(fd.get("req"));
                  const safe = Math.max(0, Math.min(31, Math.floor(val)));
                  await s
                    .from("user_settings")
                    .upsert({ monthly_required_days: safe });
                  setRequired(safe);
                }}
              >
                <input
                  name="req"
                  type="number"
                  min={0}
                  max={31}
                  defaultValue={required}
                  className="border rounded px-2 py-1 w-20"
                />
                <Button size="sm" type="submit">
                  Save
                </Button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

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
              const r = getRowFor(d);
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
                  aria-label={`Set status for ${format(d, "PP")}`}
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

          <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 px-1">
            <p>Tap to cycle: none → planned → done → none</p>
            <p>{loading ? "Loading…" : ""}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
