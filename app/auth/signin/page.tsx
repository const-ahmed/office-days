"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function SignIn() {
  const s = supabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await s.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setErr(error.message);
    window.location.href = "/app";
  };

  return (
    <main className="min-h-dvh grid place-items-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <form className="space-y-3" onSubmit={onSubmit}>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="text-sm">
            No account?{" "}
            <Link className="underline" href="/auth/signup">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
