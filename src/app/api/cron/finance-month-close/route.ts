import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { addMonths, startOfMonth } from "date-fns";
import { closeFinanceMonth } from "@/lib/finance/actions";

// Vercel Cron dispara isso todo dia 1 (ver vercel.json). Fecha o mês que
// acabou de terminar — não o mês corrente, que só está começando.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const previousMonth = addMonths(startOfMonth(new Date()), -1);
  const closure = await closeFinanceMonth(previousMonth.toISOString());

  return NextResponse.json({ closed: closure.monthKey });
}
