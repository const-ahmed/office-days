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
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

// my note: core types I actually use
type OfficeRow = { id: string; day: string; status: "PLANNED" | "DONE" };
type TodoRow = { id: string; text: string; done: boolean };

export default function AppPage() {
  const s = supabase();

  // my note: month cursor + local cache
  const [today] = useState(new Date());
  const [cursor, setCursor] = useState(startOfMonth(today));
  const [required, setRequired] = useState<number>(9);
  const [rows, setRows] = useState<OfficeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // my note: todos live in a simple list, independent of month
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [draft, setDraft] = useState("");

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const monthLabel = format(cursor, "MMMM yyyy");

  // my note: stable grid (Mon..Sun)
  const gridDays = useMemo(() => {
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  // my note: scoped month load + settings
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

  // my note: todos load once; simple order by created
  const loadTodos = async () => {
    const { data } = await s
      .from("todos")
      .select("id, text, done")
      .order("created_at", { ascending: true });
    setTodos((data ?? []) as TodoRow[]);
  };

  useEffect(() => {
    load();
  }, [cursor]);
  useEffect(() => {
    loadTodos();
  }, []);

  // my note: counters I actually use
  const planned = rows.filter((r) => r.status === "PLANNED").length;
  const done = rows.filter((r) => r.status === "DONE").length;
  const remaining = Math.max(0, required - done);
  const progressPct = Math.min(
    100,
    Math.round((done / Math.max(1, required)) * 100)
  );

  const getRowFor = (d: Date) =>
    rows.find((r) => r.day === format(d, "yyyy-MM-dd"));

  // my note: one path for insert/update/delete (NONE deletes)
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

  // my note: tap cycle I’ll actually use
  const cycle = async (d: Date) => {
    const r = getRowFor(d);
    if (!r) return setStatus(d, "PLANNED");
    if (r.status === "PLANNED") return setStatus(d, "DONE");
    return setStatus(d, "NONE");
  };

  // my note: todo CRUD I’ll actually use
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const { data } = await s
      .from("todos")
      .insert({ text })
      .select("id, text, done")
      .single();
    if (data) setTodos((prev) => [...prev, data as TodoRow]);
    setDraft("");
  };

  const toggleTodo = async (t: TodoRow) => {
    const { data } = await s
      .from("todos")
      .update({ done: !t.done })
      .eq("id", t.id)
      .select("id, text, done")
      .single();
    if (data)
      setTodos((prev) =>
        prev.map((x) => (x.id === t.id ? (data as TodoRow) : x))
      );
  };

  const editTodo = async (t: TodoRow, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const { data } = await s
      .from("todos")
      .update({ text: clean })
      .eq("id", t.id)
      .select("id, text, done")
      .single();
    if (data)
      setTodos((prev) =>
        prev.map((x) => (x.id === t.id ? (data as TodoRow) : x))
      );
  };

  const deleteTodo = async (t: TodoRow) => {
    await s.from("todos").delete().eq("id", t.id);
    setTodos((prev) => prev.filter((x) => x.id !== t.id));
  };

  return (
    <div className="p-4 mx-auto max-w-6xl space-y-4">
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
                    .upsert(
                      { monthly_required_days: safe },
                      { onConflict: "user_id" }
                    );
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

      {/* main area: calendar left, todos right (desktop); stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
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

        {/* TODOS — right side box */}
        <aside className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">My notes / todos</h2>
              </div>
              <form className="flex gap-2" onSubmit={addTodo}>
                <Input
                  placeholder="Add a note…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <Button type="submit">Add</Button>
              </form>

              <div className="space-y-2">
                {todos.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <input
                      aria-label="toggle"
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTodo(t)}
                      className="h-4 w-4"
                    />
                    <input
                      className="flex-1 rounded border px-2 py-1 text-sm"
                      defaultValue={t.text}
                      onBlur={(e) => editTodo(t, e.currentTarget.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTodo(t)}
                    >
                      Del
                    </Button>
                  </div>
                ))}
                {todos.length === 0 && (
                  <p className="text-xs text-muted-foreground">No notes yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
