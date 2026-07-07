"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createFinanceCategory,
  createFinanceClient,
  createFinanceTransaction,
  updateFinanceTransaction,
} from "@/lib/finance/actions";
import { centsToInputValue, computeNextRecurrenceDate, inputValueToCents } from "@/lib/finance/calculations";
import { format, parseISO } from "date-fns";
import { CategoryBadge } from "@/components/finance/category-badge";
import type {
  Category,
  Client,
  OwnerScope,
  RecurrenceFrequency,
  Transaction,
  TransactionKind,
  TransactionStatus,
} from "@/lib/finance/types";

const KIND_OPTIONS: { value: TransactionKind; label: string }[] = [
  { value: "receita", label: "Receita" },
  { value: "despesa", label: "Despesa" },
];

const SCOPE_OPTIONS: OwnerScope[] = ["PF", "PJ"];

const STATUS_ITEMS: Record<TransactionStatus, string> = {
  pago: "Pago",
  nao_pago: "Não pago",
  pendente: "Pendente",
};

const RECURRENCE_ITEMS: Record<string, string> = {
  none: "Sem recorrência",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  anual: "Anual",
};

export type TransactionDefaults = Partial<Pick<Transaction, "kind" | "scope" | "clientId" | "category" | "isGoon">>;

export function TransactionFormModal({
  isOpen,
  editing,
  clients,
  categories,
  defaults,
  onClose,
}: {
  isOpen: boolean;
  editing: Transaction | null;
  clients: Client[];
  categories: Category[];
  defaults?: TransactionDefaults;
  onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <TransactionForm
          key={isOpen ? (editing?.id ?? "new") : "closed"}
          editing={editing}
          clients={clients}
          categories={categories}
          defaults={defaults}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({
  editing,
  clients: initialClients,
  categories: initialCategories,
  defaults,
  onClose,
}: {
  editing: Transaction | null;
  clients: Client[];
  categories: Category[];
  defaults?: TransactionDefaults;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const [kind, setKind] = useState<TransactionKind>(editing?.kind ?? defaults?.kind ?? "despesa");
  const [scope, setScope] = useState<OwnerScope>(editing?.scope ?? defaults?.scope ?? "PJ");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? centsToInputValue(editing.amountCents) : "");
  const [category, setCategory] = useState(editing?.category ?? defaults?.category ?? initialCategories[0]?.name ?? "Outros");
  const [newCategory, setNewCategory] = useState("");
  const [clientId, setClientId] = useState<string>(editing?.clientId ?? defaults?.clientId ?? "none");
  const [newClientName, setNewClientName] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? "");
  const [paidAt, setPaidAt] = useState(editing?.paidAt ?? "");
  const [status, setStatus] = useState<TransactionStatus>(editing?.status ?? "pendente");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<string>(editing?.recurrence?.frequency ?? "none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(String(editing?.recurrence?.interval ?? 1));
  const [installmentsRemaining, setInstallmentsRemaining] = useState(
    editing?.installmentsRemaining != null ? String(editing.installmentsRemaining) : ""
  );
  const [isGoon, setIsGoon] = useState<boolean>(editing?.isGoon ?? defaults?.isGoon ?? false);

  const categoryItems: Record<string, string> = Object.fromEntries(categories.map((c) => [c.name, c.name]));
  const clientItems: Record<string, React.ReactNode> = {
    none: "Sem cliente/fornecedor",
    ...Object.fromEntries(clients.map((c) => [c.id, c.name])),
  };

  async function handleAddCategory() {
    const name = newCategory.trim();
    if (!name) return;
    setIsCreatingCategory(true);
    try {
      const created = await createFinanceCategory(name);
      setCategories((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created]));
      setCategory(created.name);
      setNewCategory("");
    } catch {
      toast.error("Não foi possível criar a categoria.");
    } finally {
      setIsCreatingCategory(false);
    }
  }

  async function handleAddClient() {
    const name = newClientName.trim();
    if (!name) return;
    setIsCreatingClient(true);
    try {
      const client = await createFinanceClient(name, scope);
      setClients((prev) => [...prev, client]);
      setClientId(client.id);
      setNewClientName("");
    } catch {
      toast.error("Não foi possível criar o cliente/fornecedor.");
    } finally {
      setIsCreatingClient(false);
    }
  }

  function handleSubmit() {
    if (!description.trim()) {
      toast.error("Descreva o lançamento.");
      return;
    }
    if (!dueDate) {
      toast.error("Informe a data de vencimento.");
      return;
    }

    const amountCents = inputValueToCents(amount);
    if (amountCents <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    const recurrence =
      recurrenceFrequency === "none"
        ? null
        : {
            frequency: recurrenceFrequency as RecurrenceFrequency,
            interval: Math.max(1, Number.parseInt(recurrenceInterval, 10) || 1),
            nextDate: format(
              computeNextRecurrenceDate(parseISO(dueDate), {
                frequency: recurrenceFrequency as RecurrenceFrequency,
                interval: Math.max(1, Number.parseInt(recurrenceInterval, 10) || 1),
              }),
              "yyyy-MM-dd"
            ),
          };

    // Coerência status ↔ data de pagamento: preencher a data marca como pago;
    // status "pago" sem data assume hoje — evita estados contraditórios.
    const effectiveStatus = paidAt ? "pago" : status;
    const effectivePaidAt =
      effectiveStatus === "pago" ? paidAt || format(new Date(), "yyyy-MM-dd") : null;

    startTransition(async () => {
      const payload = {
        kind,
        scope,
        description: description.trim(),
        amountCents,
        category,
        clientId: clientId === "none" ? null : clientId,
        dueDate,
        paidAt: effectivePaidAt,
        status: effectiveStatus,
        recurrence,
        installmentsRemaining:
          kind === "despesa" && recurrence === null && installmentsRemaining.trim()
            ? Math.max(1, Number.parseInt(installmentsRemaining, 10) || 1)
            : null,
        isGoon,
      };

      try {
        if (editing) {
          await updateFinanceTransaction(editing.id, payload);
          toast.success("Lançamento atualizado.");
        } else {
          await createFinanceTransaction(payload);
          toast.success("Lançamento criado.");
        }
        onClose();
      } catch {
        toast.error("Algo deu errado ao salvar o lançamento.");
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-gradient-violet">{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5 py-2">
        <div className="grid grid-cols-2 gap-2">
          {KIND_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-150",
                kind === option.value
                  ? option.value === "receita"
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-priority-urgent/50 bg-priority-urgent/15 text-priority-urgent"
                  : "border-border/60 bg-muted/20 text-muted-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsGoon((prev) => !prev)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-150",
            isGoon ? "border-amber-500/50 bg-amber-500/15 text-amber-400" : "border-border/60 bg-muted/20 text-muted-foreground"
          )}
        >
          <span>Lançamento do GOON</span>
          <span className="text-xs font-normal opacity-80">
            {isGoon ? "Sim — fica isolado do financeiro principal" : "Não — entra no financeiro principal"}
          </span>
        </button>

        <div className="space-y-1.5">
          <Label htmlFor="tx-description">Descrição</Label>
          <Input id="tx-description" value={description} onChange={(e) => setDescription(e.target.value)} autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tx-amount">Valor (R$)</Label>
            <Input
              id="tx-amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Escopo</Label>
            <div className="flex gap-2">
              {SCOPE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-150",
                    scope === s ? "border-primary/50 bg-primary/15 text-primary" : "border-border/60 bg-muted/20 text-muted-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select items={categoryItems} value={category} onValueChange={(v) => v && setCategory(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    <CategoryBadge name={c.name} group={c.group} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cliente / fornecedor</Label>
            <Select items={clientItems} value={clientId} onValueChange={(v) => setClientId(v ?? "none")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cliente/fornecedor</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
              placeholder="Nova categoria..."
              className="h-8 text-xs"
            />
            <Button type="button" size="sm" variant="secondary" onClick={handleAddCategory} disabled={isCreatingCategory || !newCategory.trim()}>
              {isCreatingCategory ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddClient())}
              placeholder="Novo cliente/fornecedor..."
              className="h-8 text-xs"
            />
            <Button type="button" size="sm" variant="secondary" onClick={handleAddClient} disabled={isCreatingClient || !newClientName.trim()}>
              {isCreatingClient ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tx-due">Vencimento</Label>
            <Input id="tx-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-paid">Pagamento (se já pago)</Label>
            <Input id="tx-paid" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_ITEMS) as TransactionStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
                  status === s ? "border-primary/50 bg-primary/15 text-primary" : "border-border/60 bg-muted/20 text-muted-foreground"
                )}
              >
                {STATUS_ITEMS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Recorrência</Label>
            <Select items={RECURRENCE_ITEMS} value={recurrenceFrequency} onValueChange={(v) => setRecurrenceFrequency(v ?? "none")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RECURRENCE_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {recurrenceFrequency !== "none" && (
            <div className="space-y-1.5">
              <Label htmlFor="tx-interval">Repete a cada</Label>
              <Input
                id="tx-interval"
                type="number"
                min={1}
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(e.target.value)}
              />
            </div>
          )}
        </div>

        {kind === "despesa" && recurrenceFrequency === "none" && (
          <div className="space-y-1.5">
            <Label htmlFor="tx-installments">Parcelas restantes (opcional)</Label>
            <Input
              id="tx-installments"
              type="number"
              min={1}
              placeholder="Ex.: 5"
              value={installmentsRemaining}
              onChange={(e) => setInstallmentsRemaining(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ao marcar esta despesa como paga, a próxima parcela é criada automaticamente para o mês seguinte, com o número decrescido, até acabar.
            </p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isPending} className="bg-gradient-violet glow-violet-sm text-white">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {editing ? "Salvar alterações" : "Criar lançamento"}
        </Button>
      </DialogFooter>
    </>
  );
}
