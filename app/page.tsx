import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Office Days Tracker</h1>
      <p className="mt-2 text-muted-foreground">
        Pick days, mark done, and hit your monthly target.
      </p>
      <Card className="mt-6">
        <CardContent className="p-6 space-y-4">
          <p>Sign in to start planning this month.</p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/auth/signin">Sign in</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/auth/signup">Create account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
