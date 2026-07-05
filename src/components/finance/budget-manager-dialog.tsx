"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, PiggyBank, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CategoryGroupBadge } from "@/components/finance/category-badge";
import { removeFinanceBudget, setFinanceBudget } from "@/lib/finance/actions";
import { centsToInputValue, inputValueToCents } from "@/lib/finance/calculations";
import type { Budget, CategoryGroup } from "@/lib/finance/types";

const GROUPS: CategoryGroup[] = ["casa", "pessoal", "negocio", "outro"];

export function BudgetManagerDialog({ budgets, trigger }: { budgets: Budget[]; trigger: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gradient-violet">
            <PiggyBank className="size-4" />
            Orçamento mensal por grupo
          </DialogTitle>
        </DialogHeader>
        <BudgetManagerBody key={isOpen ? "open" : "closed"} budgets={budgets} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BudgetManagerBody({ budgets }: { budgets: Budget[] }) {
  return (
    <div className="space-y-4 py-2">
      <p className="text-xs text-muted-foreground">
        Defina um limite mensal de gasto por grupo. Quando as despesas do mês passarem do limite, você recebe um
        alerta na central de notificações.
      </p>
      <div className="space-y-2">
        {GROUPS.map((group) => (
          <BudgetRow key={group} group={group} budget={budgets.find((b) => b.group === group) ?? null} />
        ))}
      </div>
    </div>
  );
}

function BudgetRow({ group, budget }: { group: CategoryGroup; budget: Budget | null }) {
  const [value, setValue] = useState(budget ? centsToInputValue(budget.limitCents) : "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const cents = inputValueToCents(value);
    if (cents <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    startTransition(async () => {
      await setFinanceBudget(group, cents);
      toast.success("Orçamento salvo.");
    });
  }

  function handleClear() {
    setValue("");
    startTransition(async () => {
      await removeFinanceBudget(group);
      toast.success("Orçamento removido.");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="w-24 shrink-0">
        <CategoryGroupBadge group={group} />
      </Label>
      <Input
        inputMode="decimal"
        placeholder="Sem limite"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        disabled={isPending}
        className="h-9 flex-1"
      />
      {budget && (
        <Button size="icon" variant="ghost" onClick={handleClear} disabled={isPending} className="text-muted-foreground">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
        </Button>
      )}
    </div>
  );
}
