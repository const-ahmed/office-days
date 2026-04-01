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

type OfficeRow = { id: string; day: string; status: "PLANNED" | "DONE" };
type TodoRow = { id: string; text: string; done: boolean; user_id: string };

export default function AppPage() {
  const s = supabase();

  const [today] = useState(new Date());
  const [cursor, setCursor] = useState(startOfMonth(today));
  const [required, setRequired] = useState<number>(9);
  const [rows, setRows] = useState<OfficeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [draft, setDraft] = useState("");

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);

  // load current user once
  useEffect(() => {
    let cancelled = false;
    s.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user)
        setCurrentUser({ id: data.user.id, email: data.user.email ?? "" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const canModify = (t: TodoRow) =>
    currentUser?.id === t.user_id ||
    currentUser?.email === "ahmed.h15@hotmail.com";

  const monthLabel = format(cursor, "MMMM yyyy");

  const gridDays = useMemo(() => {
    const ms = startOfMonth(cursor);
    const me = endOfMonth(cursor);
    const gridStart = startOfWeek(ms, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(me, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  // load office days + required count for the current month
  useEffect(() => {
    let cancelled = false;
    const ms = startOfMonth(cursor);
    const me = endOfMonth(cursor);
    const monthKey = format(ms, "yyyy-MM");
    const from = format(ms, "yyyy-MM-dd");
    const to = format(me, "yyyy-MM-dd");

    (async () => {
      setLoading(true);

      const { data: monthReq } = await s
        .from("monthly_required_days")
        .select("required_days")
        .eq("month", monthKey)
        .maybeSingle();

      const { data: days } = await s
        .from("office_days")
        .select("id, day, status")
        .gte("day", from)
        .lte("day", to)
        .order("day", { ascending: true });

      if (!cancelled) {
        setRequired(monthReq?.required_days ?? 9);
        setRows((days ?? []) as OfficeRow[]);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cursor]);

  // load todos once — all users' todos
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await s
        .from("todos")
        .select("id, text, done, user_id")
        .order("created_at", { ascending: true });
      if (!cancelled) setTodos((data ?? []) as TodoRow[]);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const planned = rows.filter((r) => r.status === "PLANNED").length;
  const done = rows.filter((r) => r.status === "DONE").length;
  const remaining = Math.max(0, required - done);
  const progressPct = Math.min(
    100,
    Math.round((done / Math.max(1, required)) * 100),
  );

  const getRowFor = (d: Date) =>
    rows.find((r) => r.day === format(d, "yyyy-MM-dd"));

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
        prev.map((p) => (p.id === existing.id ? (data as OfficeRow) : p)),
      );
  };

  const cycle = async (d: Date) => {
    const r = getRowFor(d);
    if (!r) return setStatus(d, "PLANNED");
    if (r.status === "PLANNED") return setStatus(d, "DONE");
    return setStatus(d, "NONE");
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const { data } = await s
      .from("todos")
      .insert({ text })
      .select("id, text, done, user_id")
      .single();
    if (data) setTodos((prev) => [...prev, data as TodoRow]);
    setDraft("");
  };

  const toggleTodo = async (t: TodoRow) => {
    if (!canModify(t)) return;
    const { data } = await s
      .from("todos")
      .update({ done: !t.done })
      .eq("id", t.id)
      .select("id, text, done, user_id")
      .single();
    if (data)
      setTodos((prev) =>
        prev.map((x) => (x.id === t.id ? (data as TodoRow) : x)),
      );
  };

  const editTodo = async (t: TodoRow, text: string) => {
    if (!canModify(t)) return;
    const clean = text.trim();
    if (!clean) return;
    const { data } = await s
      .from("todos")
      .update({ text: clean })
      .eq("id", t.id)
      .select("id, text, done, user_id")
      .single();
    if (data)
      setTodos((prev) =>
        prev.map((x) => (x.id === t.id ? (data as TodoRow) : x)),
      );
  };

  const deleteTodo = async (t: TodoRow) => {
    if (!canModify(t)) return;
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

        <div className="flex items-center gap-2">
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
                    const monthKey = format(startOfMonth(cursor), "yyyy-MM");

                    await s.from("monthly_required_days").upsert(
                      {
                        user_id: currentUser?.id,
                        month: monthKey,
                        required_days: safe,
                      },
                      { onConflict: "user_id, month" },
                    );

                    setRequired(safe);
                  }}
                >
                  <input
                    key={required}
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

          <Button
            variant="outline"
            onClick={async () => {
              await s.auth.signOut();
              window.location.href = "/";
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

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

        <aside className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-semibold">Suggestions / Bugs</h2>
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
                      disabled={!canModify(t)}
                    />
                    <input
                      className="flex-1 min-w-0 rounded border px-2 py-1 text-sm"
                      defaultValue={t.text}
                      onBlur={(e) => editTodo(t, e.currentTarget.value)}
                      readOnly={!canModify(t)}
                    />
                    {canModify(t) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTodo(t)}
                      >
                        Del
                      </Button>
                    )}
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
