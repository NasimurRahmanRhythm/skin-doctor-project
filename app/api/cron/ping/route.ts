import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Keep-alive for the Supabase free tier.
 *
 * A free project pauses after ~7 days without database activity, and it does
 * NOT wake itself up again — someone has to click Resume in the dashboard.
 * One trivial query a day is enough to prevent that. The clinic's own daily
 * use covers this in production; this route exists to protect quiet stretches
 * during the build.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically.
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("staff").select("id").limit(1);

  // Before the migrations run there is no `staff` table yet. PostgREST answers
  // that with PGRST205 (missing from its schema cache), or 42P01 if the query
  // reaches Postgres directly. Either way the request got through, which is
  // all the keep-alive needs.
  const SCHEMA_NOT_READY = ["PGRST205", "42P01"];
  const reachedDatabase = !error || SCHEMA_NOT_READY.includes(error.code);

  if (!reachedDatabase) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    schemaReady: !error,
    at: new Date().toISOString(),
  });
}
