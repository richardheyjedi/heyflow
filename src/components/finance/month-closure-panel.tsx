"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Loader2, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { closeFinanceMonth, deleteFinanceMonthClosure } from "@/lib/finance/actions";
import { formatCurrencyBRL } from "@/lib/finance/calculations";
import type { MonthClosure } from "@/lib/finance/types";

function monthLabel(monthKey: string): string {
  return format(parseISO(`${monthKey}-01`), "MMMM 'de' yyyy", { locale: ptBR });
}

export function MonthClosurePanel({ closures, todayISO }: { closures: MonthClosure[]; todayISO: string }) {
  const [isPending, startTransition] = useTransition();
  const [reopenTarget, setReopenTarget] = useState<MonthClosure | null>(null);
  const currentMonthKey = todayISO.slice(0, 7);
  const currentAlreadyClosed = closures.some((c) => c.monthKey === currentMonthKey);

  function handleClose() {
    startTransition(async () => {
      try {
        const closure = await closeFinanceMonth(todayISO);
        toast.success(`${monthLabel(closure.monthKey)} fechado com sucesso.`);
      } catch {
        toast.error("Algo deu errado ao virar o mês.");
      }
    });
  }

  function handleReopen(closure: MonthClosure) {
    startTransition(async () => {
      try {
        await deleteFinanceMonthClosure(closure.id);
        toast.success(`${monthLabel(closure.monthKey)} reaberto.`);
      } catch {
        toast.error("Não foi possível reabrir o mês.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Virar o mês</h2>
          <p className="text-xs text-muted-foreground">
            Congela os totais do mês no histórico e descarta despesas avulsas pendentes (sem recorrência ou parcelas).
            Acontece automaticamente todo dia 1, mas você pode antecipar.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button size="sm" variant="outline" disabled={currentAlreadyClosed || isPending} />
            }
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarCheck className="size-3.5" />}
            {currentAlreadyClosed ? "Mês já fechado" : "Virar o mês"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Virar o mês de {monthLabel(currentMonthKey)}?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso congela um snapshot dos totais deste mês no histórico e apaga as despesas avulsas ainda não
                pagas (sem recorrência nem parcelas restantes). Despesas já pagas, recorrências e parcelamentos em
                andamento não são afetados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleClose} disabled={isPending} className="bg-gradient-violet text-white">
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {closures.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5 border-t border-border/60 pt-4">
          {closures.slice(0, 6).map((closure) => (
            <div key={closure.id} className="group flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Lock className="size-3" />
                {monthLabel(closure.monthKey)}
              </span>
              <span className="flex items-center gap-2">
                {closure.pendingCount > 0 && (
                  <span className="text-priority-urgent/80">{closure.pendingCount} pendente(s)</span>
                )}
                <span
                  className={closure.saldoCents >= 0 ? "font-medium text-primary" : "font-medium text-priority-urgent"}
                >
                  {formatCurrencyBRL(closure.saldoCents)}
                </span>
                <button
                  type="button"
                  onClick={() => setReopenTarget(closure)}
                  disabled={isPending}
                  title="Reabrir mês (exclui o snapshot)"
                  className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                >
                  <LockOpen className="size-3" />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={reopenTarget !== null} onOpenChange={(open) => !open && setReopenTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reabrir {reopenTarget ? monthLabel(reopenTarget.monthKey) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O snapshot com os totais congelados deste mês será excluído do histórico e você poderá virar o mês de
              novo. As despesas avulsas descartadas no fechamento não voltam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (reopenTarget) handleReopen(reopenTarget);
                setReopenTarget(null);
              }}
              className="bg-gradient-violet text-white"
            >
              Reabrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
