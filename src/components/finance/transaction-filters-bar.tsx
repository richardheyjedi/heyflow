"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CATEGORY_GROUP_LABEL,
  type CategoryGroup,
  type Client,
  type PeriodFilter,
  type TransactionFilters,
  type TransactionStatus,
} from "@/lib/finance/types";

const PERIOD_ITEMS: Record<PeriodFilter, string> = {
  current_month: "Mês atual",
  next_30_days: "Próximos 30 dias",
  custom: "Período customizado",
};

const STATUS_ITEMS: Record<string, string> = {
  all: "Todos os status",
  pago: "Pago",
  nao_pago: "Não pago",
  pendente: "Pendente",
  atrasado: "Atrasados",
};

const GROUP_ITEMS: Record<string, string> = {
  all: "Todos os grupos",
  ...CATEGORY_GROUP_LABEL,
};

export function TransactionFiltersBar({
  filters,
  onChange,
  clients,
}: {
  filters: TransactionFilters;
  onChange: (patch: Partial<TransactionFilters>) => void;
  clients: Client[];
}) {
  const clientItems: Record<string, React.ReactNode> = {
    all: "Todos os clientes",
    ...Object.fromEntries(clients.map((c) => [c.id, c.name])),
  };
  const scopeItems: Record<string, string> = { all: "PF + PJ", PF: "Somente PF", PJ: "Somente PJ" };

  const isOverdueFilter = filters.status === "atrasado";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={PERIOD_ITEMS}
        value={filters.period}
        onValueChange={(v) => v && onChange({ period: v as PeriodFilter })}
        disabled={isOverdueFilter}
      >
        <SelectTrigger size="sm" className="w-44" title={isOverdueFilter ? "Ignorado — mostrando atrasados de qualquer período" : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PERIOD_ITEMS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filters.period === "custom" && !isOverdueFilter && (
        <>
          <Input
            type="date"
            className="h-7 w-36 text-xs"
            value={filters.customStart ?? ""}
            onChange={(e) => onChange({ customStart: e.target.value })}
          />
          <Input
            type="date"
            className="h-7 w-36 text-xs"
            value={filters.customEnd ?? ""}
            onChange={(e) => onChange({ customEnd: e.target.value })}
          />
        </>
      )}

      <Select
        items={STATUS_ITEMS}
        value={filters.status}
        onValueChange={(v) => v && onChange({ status: v as TransactionStatus | "all" | "atrasado" })}
      >
        <SelectTrigger size="sm" className={cn("w-36", isOverdueFilter && "border-priority-urgent/50 text-priority-urgent")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUS_ITEMS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select items={clientItems} value={filters.clientId} onValueChange={(v) => v && onChange({ clientId: v })}>
        <SelectTrigger size="sm" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os clientes</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select items={scopeItems} value={filters.scope} onValueChange={(v) => v && onChange({ scope: v as "PF" | "PJ" | "all" })}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(scopeItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={GROUP_ITEMS}
        value={filters.categoryGroup}
        onValueChange={(v) => v && onChange({ categoryGroup: v as CategoryGroup | "all" })}
      >
        <SelectTrigger size="sm" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(GROUP_ITEMS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
