import { cn } from "@/lib/utils";
import type { TransactionStatus } from "@/lib/finance/types";

const STATUS_LABEL: Record<TransactionStatus, string> = {
  pago: "Pago",
  nao_pago: "Não pago",
  pendente: "Pendente",
};

const STATUS_STYLES: Record<TransactionStatus, string> = {
  pago: "bg-primary/15 text-primary border-primary/25",
  nao_pago: "bg-priority-urgent/15 text-priority-urgent border-priority-urgent/25",
  pendente: "bg-priority-medium/15 text-priority-medium border-priority-medium/25",
};

export function TransactionStatusBadge({ status, className }: { status: TransactionStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
