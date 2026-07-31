"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BellRing,
  Check,
  ListOrdered,
  MoreHorizontal,
  Repeat,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/taskflow/empty-state";
import { CategoryBadge } from "@/components/finance/category-badge";
import type { TransactionMutations } from "@/components/finance/use-transaction-mutations";
import { toast } from "sonner";
import {
  centsToInputValue,
  formatCurrencyBRL,
  getClientName,
  inputValueToCents,
  isTransactionOverdue,
} from "@/lib/finance/calculations";
import { cn } from "@/lib/utils";
import type { Category, Client, OwnerScope, Transaction, TransactionStatus } from "@/lib/finance/types";

const STATUS_LABEL: Record<TransactionStatus, string> = {
  pago: "Pago",
  nao_pago: "Não pago",
  pendente: "Pendente",
};

const STATUS_TRIGGER_STYLES: Record<TransactionStatus, string> = {
  pago: "text-primary",
  nao_pago: "text-priority-urgent",
  pendente: "text-priority-medium",
};

type SortField = "description" | "category" | "dueDate" | "amountCents" | "status";
type SortDirection = "asc" | "desc";

const COLUMNS: { field: SortField; label: string; className?: string }[] = [
  { field: "description", label: "Descrição" },
  { field: "category", label: "Categoria" },
  { field: "dueDate", label: "Vencimento" },
  { field: "amountCents", label: "Valor", className: "text-right" },
  { field: "status", label: "Status" },
];

export function TransactionTable({
  transactions,
  clients,
  categories,
  referenceDate,
  selectedIds,
  mutations,
  onToggleRow,
  onToggleAll,
  onEdit,
  onScheduleCharge,
}: {
  transactions: Transaction[];
  clients: Client[];
  categories: Category[];
  /** Dia de referência vindo do servidor — mantém SSR e cliente idênticos (badge "Atrasado"). */
  referenceDate: Date;
  selectedIds: Set<string>;
  /** Handlers otimistas do container (useTransactionMutations) — a UI reflete a mudança na hora. */
  mutations: TransactionMutations;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onEdit: (transaction: Transaction) => void;
  onScheduleCharge: (transaction: Transaction) => void;
}) {
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const groupByCategoryName = useMemo(() => new Map(categories.map((c) => [c.name, c.group])), [categories]);
  const categoryItems: Record<string, string> = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.name, c.name])),
    [categories]
  );
  const clientItems: Record<string, string> = useMemo(
    () => ({ none: "Sem cliente/fornecedor", ...Object.fromEntries(clients.map((c) => [c.id, c.name])) }),
    [clients]
  );

  const sorted = useMemo(() => {
    const factor = sortDirection === "asc" ? 1 : -1;
    return [...transactions].sort((a, b) => {
      if (sortField === "amountCents") return (a.amountCents - b.amountCents) * factor;
      return a[sortField].localeCompare(b[sortField]) * factor;
    });
  }, [transactions, sortField, sortDirection]);

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  if (transactions.length === 0) {
    return <EmptyState title="Nenhum lançamento encontrado" description="Ajuste os filtros ou crie um novo lançamento." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="bg-card/80">
            <th className="w-10 border-b border-border/70 px-3 py-2.5">
              <Checkbox
                checked={transactions.length > 0 && selectedIds.size === transactions.length}
                onCheckedChange={onToggleAll}
                aria-label="Selecionar todos"
              />
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.field}
                onClick={() => toggleSort(col.field)}
                className={cn(
                  "cursor-pointer select-none whitespace-nowrap border-b border-border/70 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground",
                  col.className
                )}
              >
                <span className={cn("inline-flex items-center gap-1", col.className === "text-right" && "justify-end")}>
                  {col.label}
                  {sortField === col.field ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3" />
                    ) : (
                      <ArrowDown className="size-3" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30" />
                  )}
                </span>
              </th>
            ))}
            <th className="whitespace-nowrap border-b border-border/70 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">
              Cliente
            </th>
            <th className="w-10 border-b border-border/70 px-2 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((transaction) => {
            const clientName = getClientName(clients, transaction.clientId);
            const group = groupByCategoryName.get(transaction.category) ?? "outro";
            const overdue = isTransactionOverdue(transaction, referenceDate);

            return (
              <tr
                key={transaction.id}
                className={cn(
                  "group transition-colors hover:bg-accent/30",
                  selectedIds.has(transaction.id) && "bg-primary/5",
                  overdue && !selectedIds.has(transaction.id) && "bg-priority-urgent/5"
                )}
              >
                <td className="border-b border-border/40 px-3 py-2">
                  <Checkbox
                    checked={selectedIds.has(transaction.id)}
                    onCheckedChange={() => onToggleRow(transaction.id)}
                    aria-label={`Selecionar ${transaction.description}`}
                  />
                </td>
                <td className="whitespace-nowrap border-b border-border/40 px-3 py-2">
                  <InlineTextCell
                    value={transaction.description}
                    prefix={transaction.kind === "despesa" ? "− " : "+ "}
                    onSave={(value) => mutations.changeFields(transaction.id, { description: value })}
                  />
                  <span className="ml-1 inline-flex items-center gap-1 align-middle text-muted-foreground">
                    {transaction.recurrence && <Repeat className="size-3" />}
                    {transaction.installmentsRemaining != null && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px]"
                        title={`${transaction.installmentsRemaining} parcela(s) restante(s)`}
                      >
                        <ListOrdered className="size-3" />
                        {transaction.installmentsRemaining}x
                      </span>
                    )}
                    {transaction.reminderId && <BellRing className="size-3 text-primary" />}
                  </span>
                </td>
                <td className="border-b border-border/40 px-3 py-2">
                  <Select
                    items={categoryItems}
                    value={transaction.category}
                    onValueChange={(v) => v && mutations.changeCategory(transaction.id, v)}
                  >
                    <SelectTrigger className="h-auto w-auto gap-1 border-none bg-transparent p-0 shadow-none hover:opacity-80 focus-visible:ring-0">
                      <SelectValue>
                        <CategoryBadge name={transaction.category} group={group} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          <CategoryBadge name={c.name} group={c.group} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="whitespace-nowrap border-b border-border/40 px-3 py-2 text-muted-foreground">
                  <InlineDateCell
                    value={transaction.dueDate}
                    onSave={(value) => mutations.changeFields(transaction.id, { dueDate: value })}
                    display={
                      <div className={cn("flex items-center gap-1", overdue && "font-medium text-priority-urgent")}>
                        {overdue && <AlertTriangle className="size-3" />}
                        {format(parseISO(transaction.dueDate), "dd MMM", { locale: ptBR })}
                      </div>
                    }
                  />
                  {transaction.paidAt && (
                    <div className="text-[11px]">Pago {format(parseISO(transaction.paidAt), "dd MMM", { locale: ptBR })}</div>
                  )}
                  {overdue && <div className="text-[11px] text-priority-urgent">Atrasado</div>}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap border-b border-border/40 px-3 py-2 text-right font-semibold",
                    transaction.kind === "receita" ? "text-primary" : "text-foreground"
                  )}
                >
                  <InlineAmountCell
                    amountCents={transaction.amountCents}
                    onSave={(cents) => mutations.changeFields(transaction.id, { amountCents: cents })}
                  />
                </td>
                <td className="whitespace-nowrap border-b border-border/40 px-3 py-2">
                  <Select
                    value={transaction.status}
                    onValueChange={(v) => v && mutations.changeStatus(transaction, v as TransactionStatus)}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-auto w-auto gap-1 border-none bg-transparent p-0 text-xs font-medium shadow-none hover:opacity-80 focus-visible:ring-0",
                        STATUS_TRIGGER_STYLES[transaction.status]
                      )}
                    >
                      <SelectValue>
                        <span className="inline-flex items-center gap-1">
                          {transaction.status === "pago" && <Check className="size-3" />}
                          {STATUS_LABEL[transaction.status]}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as TransactionStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="whitespace-nowrap border-b border-border/40 px-3 py-2 text-muted-foreground">
                  <Select
                    value={transaction.scope}
                    onValueChange={(v) =>
                      v && v !== transaction.scope && mutations.changeFields(transaction.id, { scope: v as OwnerScope })
                    }
                  >
                    <SelectTrigger className="mr-1.5 h-auto w-auto gap-0.5 rounded-full border-none bg-muted/50 px-1.5 py-0.5 text-[10px] shadow-none hover:opacity-80 focus-visible:ring-0">
                      <SelectValue>{transaction.scope}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PF">PF</SelectItem>
                      <SelectItem value="PJ">PJ</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    items={clientItems}
                    value={transaction.clientId ?? "none"}
                    onValueChange={(v) => {
                      const next = !v || v === "none" ? null : v;
                      if (next !== transaction.clientId) mutations.changeFields(transaction.id, { clientId: next });
                    }}
                  >
                    <SelectTrigger className="h-auto w-auto gap-1 border-none bg-transparent p-0 text-sm shadow-none hover:opacity-80 focus-visible:ring-0">
                      <SelectValue>{clientName ?? "—"}</SelectValue>
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
                </td>
                <td className="border-b border-border/40 px-2 py-2 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<button className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100" />}>
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(transaction)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          mutations.changeFields(
                            transaction.id,
                            { kind: transaction.kind === "receita" ? "despesa" : "receita" },
                            transaction.kind === "receita" ? "Convertido em despesa." : "Convertido em receita."
                          )
                        }
                      >
                        {transaction.kind === "receita" ? "Converter em despesa" : "Converter em receita"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => mutations.duplicate(transaction.id)}>Duplicar</DropdownMenuItem>
                      {transaction.kind === "receita" && !transaction.reminderId && (
                        <DropdownMenuItem onClick={() => onScheduleCharge(transaction)}>Programar cobrança</DropdownMenuItem>
                      )}
                      {transaction.reminderId && (
                        <DropdownMenuItem onClick={() => mutations.cancelCharge(transaction.id)}>
                          Cancelar cobrança
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(transaction)}
                        className="text-priority-urgent focus:text-priority-urgent"
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &quot;{deleteTarget?.description}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {formatCurrencyBRL(deleteTarget?.amountCents ?? 0)} — essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) mutations.remove(deleteTarget.id);
                setDeleteTarget(null);
              }}
              className="bg-priority-urgent text-white hover:bg-priority-urgent/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Células editáveis inline (estilo planilha): clique para editar; Enter ou
// clicar fora salva, Esc cancela. O salvamento é otimista (useTransactionMutations).
// ---------------------------------------------------------------------------

function InlineTextCell({
  value,
  prefix,
  onSave,
}: {
  value: string;
  prefix: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) return;
    onSave(trimmed);
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="inline-block h-7 w-52 align-middle text-sm"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="max-w-56 truncate text-left font-medium text-foreground hover:underline"
      title={`${value} — clique para editar`}
    >
      {prefix}
      {value}
    </button>
  );
}

function InlineAmountCell({ amountCents, onSave }: { amountCents: number; onSave: (cents: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    setEditing(false);
    const cents = inputValueToCents(draft);
    if (cents === amountCents) return;
    if (cents <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    onSave(cents);
  }

  if (editing) {
    return (
      <Input
        autoFocus
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="inline-block h-7 w-28 text-right align-middle text-sm"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(centsToInputValue(amountCents));
        setEditing(true);
      }}
      className="hover:underline"
      title="Clique para editar o valor"
    >
      {formatCurrencyBRL(amountCents)}
    </button>
  );
}

function InlineDateCell({
  value,
  display,
  onSave,
}: {
  /** ISO yyyy-MM-dd. */
  value: string;
  display: React.ReactNode;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    if (!draft || draft === value) return;
    onSave(draft);
  }

  if (editing) {
    return (
      <Input
        autoFocus
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="inline-block h-7 w-36 align-middle text-xs"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="hover:underline"
      title="Clique para editar o vencimento"
    >
      {display}
    </button>
  );
}
