"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DrePanel } from "@/components/finance/dre-panel";
import { getDRE } from "@/lib/finance/calculations";
import type { Transaction } from "@/lib/finance/types";

export function DreTab({ transactions }: { transactions: Transaction[] }) {
  const now = useMemo(() => new Date(), []);
  const dre = useMemo(() => getDRE(transactions, now), [transactions, now]);
  const monthLabel = format(now, "MMMM/yy", { locale: ptBR });

  return <DrePanel dre={dre} monthLabel={monthLabel} />;
}
