"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transactionsToCSV } from "@/lib/finance/calculations";
import type { Client, Transaction } from "@/lib/finance/types";

export function ExportCsvButton({ transactions, clients }: { transactions: Transaction[]; clients: Client[] }) {
  function handleExport() {
    const csv = transactionsToCSV(transactions, clients);
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lancamentos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={transactions.length === 0}>
      <Download className="size-3.5" />
      Exportar CSV
    </Button>
  );
}
