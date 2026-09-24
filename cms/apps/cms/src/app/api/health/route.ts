import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export async function GET() {
  try {
    await (await getDb()).execute(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
