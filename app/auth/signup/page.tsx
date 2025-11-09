"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function SignUp() {
  const s = supabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await s.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      return setErr(error.message);
    }
    const { data: u } = await s.auth.getUser();
    if (u?.user?.id)
      await s.from("user_settings").upsert({ user_id: u.user.id });
    setLoading(false);
    window.location.href = "/app";
  };

  return (
    <main className="min-h-dvh grid place-items-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-xl font-semibold">Create account</h1>
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
              {loading ? "Creating…" : "Sign up"}
            </Button>
          </form>
          <p className="text-sm">
            Have an account?{" "}
            <Link className="underline" href="/auth/signin">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
