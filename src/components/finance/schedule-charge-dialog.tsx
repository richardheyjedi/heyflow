"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { scheduleFinanceReminder } from "@/lib/finance/actions";
import { formatCurrencyBRL, getClientName } from "@/lib/finance/calculations";
import type { Client, Transaction } from "@/lib/finance/types";

export function ScheduleChargeDialog({
  transaction,
  clients,
  onClose,
}: {
  transaction: Transaction | null;
  clients: Client[];
  onClose: () => void;
}) {
  return (
    <Dialog open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {/* key força um novo estado de formulário sempre que o lançamento alvo muda */}
        <ScheduleChargeForm key={transaction?.id ?? "closed"} transaction={transaction} clients={clients} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function ScheduleChargeForm({
  transaction,
  clients,
  onClose,
}: {
  transaction: Transaction | null;
  clients: Client[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const clientName = transaction ? getClientName(clients, transaction.clientId) : null;
  const [date, setDate] = useState(transaction?.dueDate ?? "");
  const [message, setMessage] = useState(
    transaction
      ? `Cobrar ${clientName ?? transaction.description} — ${formatCurrencyBRL(transaction.amountCents)}`
      : ""
  );

  function handleSubmit() {
    if (!transaction) return;
    if (!date || !message.trim()) {
      toast.error("Preencha a data e a mensagem da cobrança.");
      return;
    }
    startTransition(async () => {
      try {
        await scheduleFinanceReminder(transaction.id, date, message.trim());
        toast.success("Cobrança agendada — lembrete criado no TaskFlow.");
        onClose();
      } catch {
        toast.error("Não foi possível agendar a cobrança.");
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-gradient-violet">Programar cobrança</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="reminder-date">Data do lembrete</Label>
          <Input id="reminder-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reminder-message">Mensagem</Label>
          <Textarea id="reminder-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Isso cria uma tarefa de alta prioridade no TaskFlow na data escolhida.
        </p>
      </div>
      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isPending} className="bg-gradient-violet glow-violet-sm text-white">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Agendar cobrança
        </Button>
      </DialogFooter>
    </>
  );
}
