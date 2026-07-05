"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/taskflow/empty-state";
import { createFinanceClient, deleteFinanceClient, updateFinanceClient } from "@/lib/finance/actions";
import { formatCurrencyBRL, getClientStats, type ClientStats } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils";
import type { Client, OwnerScope, Transaction } from "@/lib/finance/types";

const CLIENT_COLOR_OPTIONS = ["#8B5CF6", "#A855F7", "#C084FC", "#7C3AED", "#6D28D9", "#FB7185", "#60A5FA", "#F59E0B"];
const KIND_ITEMS: Record<OwnerScope, string> = { PF: "PF", PJ: "PJ" };

export function ClientsTab({ transactions, clients }: { transactions: Transaction[]; clients: Client[] }) {
  const stats = getClientStats(transactions, clients);

  return (
    <div className="flex flex-col gap-4">
      <NewClientForm />

      {stats.length === 0 ? (
        <EmptyState
          title="Nenhum cliente/fornecedor ainda"
          description="Cadastre acima quem paga suas receitas ou recebe seus pagamentos."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((s) => (
            <ClientCard key={s.client.id} stats={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewClientForm() {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<OwnerScope>("PJ");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsCreating(true);
    try {
      await createFinanceClient(trimmed, kind);
      setName("");
      toast.success("Cliente criado.");
    } catch {
      toast.error("Não foi possível criar o cliente.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/60 p-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
        placeholder="Novo cliente/fornecedor..."
        className="h-9 flex-1 min-w-40"
      />
      <Select value={kind} onValueChange={(v) => v && setKind(v as OwnerScope)}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(KIND_ITEMS) as OwnerScope[]).map((k) => (
            <SelectItem key={k} value={k}>
              {KIND_ITEMS[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleCreate} disabled={isCreating || !name.trim()} className="bg-gradient-violet glow-violet-sm text-white">
        {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Novo cliente
      </Button>
    </div>
  );
}

function ClientCard({ stats }: { stats: ClientStats }) {
  const { client } = stats;
  const [name, setName] = useState(client.name);
  const [kind, setKind] = useState<OwnerScope>(client.kind);
  const [isPending, startTransition] = useTransition();

  function persist(patch: Partial<{ name: string; kind: OwnerScope; color: string }>) {
    const next = { name, kind, color: client.color, ...patch };
    startTransition(async () => {
      await updateFinanceClient(client.id, next);
    });
  }

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === client.name) {
      setName(client.name);
      return;
    }
    persist({ name: trimmed });
    toast.success("Cliente atualizado.");
  }

  function changeKind(value: string | null) {
    if (!value) return;
    const nextKind = value as OwnerScope;
    setKind(nextKind);
    persist({ kind: nextKind });
  }

  function changeColor(color: string) {
    persist({ color });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteFinanceClient(client.id);
      toast.success("Cliente removido. Lançamentos ligados a ele ficam sem cliente.");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: client.color }} />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            disabled={isPending}
            className="h-8 flex-1 border-none bg-transparent px-1 font-medium shadow-none focus-visible:border-input focus-visible:bg-input/30"
          />
        </div>
        <Button size="icon-sm" variant="ghost" onClick={handleDelete} disabled={isPending} className="text-priority-urgent hover:text-priority-urgent">
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Select value={kind} onValueChange={changeKind}>
          <SelectTrigger size="sm" className="w-20" disabled={isPending}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(KIND_ITEMS) as OwnerScope[]).map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_ITEMS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          {CLIENT_COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => changeColor(c)}
              className={cn(
                "size-4 rounded-full border-2 transition-transform duration-150",
                client.color === c ? "scale-110 border-white/70" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
        <Stat label="Recebido" value={formatCurrencyBRL(stats.receivedCents)} />
        <Stat label="A receber" value={formatCurrencyBRL(stats.receivableCents)} />
        {(stats.paidOutCents > 0 || stats.payableCents > 0) && (
          <>
            <Stat label="Pago a ele" value={formatCurrencyBRL(stats.paidOutCents)} />
            <Stat label="A pagar" value={formatCurrencyBRL(stats.payableCents)} />
          </>
        )}
        <Stat
          label="Atrasado"
          value={formatCurrencyBRL(stats.overdueCents)}
          tone={stats.overdueCents > 0 ? "urgent" : undefined}
        />
        <Stat
          label="Último lançamento"
          value={stats.lastCreatedAt ? format(parseISO(stats.lastCreatedAt), "dd MMM yyyy", { locale: ptBR }) : "—"}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{stats.transactionCount} lançamento(s)</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "urgent" }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={cn("font-semibold text-foreground", tone === "urgent" && "text-priority-urgent")}>{value}</p>
    </div>
  );
}
