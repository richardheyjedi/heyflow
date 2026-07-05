"use client";

import { Check, Loader2, Trash2, Undo2, X } from "lucide-react";
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

export function BulkActionsBar({
  count,
  isPending,
  onMarkPaid,
  onMarkUnpaid,
  onDelete,
  onClear,
}: {
  count: number;
  isPending: boolean;
  onMarkPaid: () => void;
  onMarkUnpaid: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5">
      <span className="text-sm font-medium text-foreground">{count} selecionado{count === 1 ? "" : "s"}</span>
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onMarkPaid} disabled={isPending}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          Marcar como pago
        </Button>
        <Button size="sm" variant="secondary" onClick={onMarkUnpaid} disabled={isPending}>
          <Undo2 className="size-3.5" />
          Marcar como não pago
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button size="sm" variant="outline" className="text-priority-urgent hover:text-priority-urgent" disabled={isPending} />
            }
          >
            <Trash2 className="size-3.5" />
            Excluir
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {count} lançamento{count === 1 ? "" : "s"}?</AlertDialogTitle>
              <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-priority-urgent text-white hover:bg-priority-urgent/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button size="icon-sm" variant="ghost" onClick={onClear} title="Cancelar seleção">
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
