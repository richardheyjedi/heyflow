"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit3, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Lead, LeadStage } from "@/generated/prisma/client";
import { createLead, deleteLead, moveLead, updateLead, type LeadInput } from "@/lib/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STAGES: { id: LeadStage; label: string; color: string }[] = [
  { id: "novo", label: "Novos", color: "bg-sky-500" }, { id: "contato", label: "Em contato", color: "bg-violet-500" },
  { id: "proposta", label: "Proposta", color: "bg-amber-500" }, { id: "negociacao", label: "Negociação", color: "bg-orange-500" },
  { id: "fechado_ganho", label: "Fechados", color: "bg-emerald-500" }, { id: "fechado_perdido", label: "Perdidos", color: "bg-rose-500" },
];
const emptyInput: LeadInput = { name: "", company: "", email: "", phone: "", source: "", stage: "novo", valueCents: 0, notes: "", nextContact: "" };
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function CrmBoard({ leads }: { leads: Lead[] }) {
  const [query, setQuery] = useState(""); const [editor, setEditor] = useState<Lead | null | "new">(null);
  const filtered = useMemo(() => { const n = query.trim().toLowerCase(); return n ? leads.filter((l) => [l.name,l.company,l.email,l.phone,l.source].some((v) => v?.toLowerCase().includes(n))) : leads; }, [leads, query]);
  const active = leads.filter((l) => !l.stage.startsWith("fechado"));
  const pipelineValue = active.reduce((sum, l) => sum + l.valueCents, 0);
  const wonValue = leads.filter((l) => l.stage === "fechado_ganho").reduce((sum, l) => sum + l.valueCents, 0);
  return <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold tracking-tight">CRM</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe cada oportunidade, do primeiro contato ao fechamento.</p></div><Button className="bg-gradient-violet text-white" onClick={() => setEditor("new")}><Plus /> Novo lead</Button></div>
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Leads no funil" value={String(active.length)} /><Metric label="Valor em negociação" value={currency.format(pipelineValue / 100)} /><Metric label="Vendas fechadas" value={currency.format(wonValue / 100)} tone="text-emerald-600 dark:text-emerald-400" /></div>
    <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, empresa ou contato..." className="h-10 pl-9" /></div>
    <div className="overflow-x-auto pb-4"><div className="grid min-w-[1300px] grid-cols-6 gap-3">{STAGES.map((stage) => <PipelineColumn key={stage.id} stage={stage} leads={filtered.filter((l) => l.stage === stage.id)} onEdit={setEditor} />)}</div></div>
    {editor && <LeadEditor lead={editor === "new" ? null : editor} onClose={() => setEditor(null)} />}
  </div>;
}
function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) { return <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className={cn("mt-1 text-xl font-semibold", tone)}>{value}</p></div>; }
function PipelineColumn({ stage, leads, onEdit }: { stage: (typeof STAGES)[number]; leads: Lead[]; onEdit: (lead: Lead) => void }) {
  const [, startTransition] = useTransition(); const changeStage = (id: string, next: LeadStage) => startTransition(async () => { await moveLead(id, next); toast.success("Lead movido no funil."); });
  return <section className="rounded-2xl bg-muted/65 p-2.5"><div className="mb-3 flex items-center gap-2 px-1"><span className={cn("size-2.5 rounded-full", stage.color)} /><h2 className="flex-1 text-sm font-semibold">{stage.label}</h2><span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{leads.length}</span></div><div className="flex min-h-24 flex-col gap-2">{leads.map((lead) => <LeadCard key={lead.id} lead={lead} stage={stage.id} onEdit={onEdit} onMove={changeStage} />)}{!leads.length && <p className="px-2 py-5 text-center text-xs text-muted-foreground">Sem leads</p>}</div></section>;
}
function LeadCard({ lead, stage, onEdit, onMove }: { lead: Lead; stage: LeadStage; onEdit: (lead: Lead) => void; onMove: (id: string, stage: LeadStage) => void }) { return <article className="rounded-xl border border-border bg-card p-3 shadow-sm"><div className="flex gap-2"><button onClick={() => onEdit(lead)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-semibold">{lead.name}</p>{lead.company && <p className="mt-0.5 truncate text-xs text-muted-foreground">{lead.company}</p>}</button><Edit3 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /></div>{lead.valueCents > 0 && <p className="mt-3 text-sm font-semibold">{currency.format(lead.valueCents / 100)}</p>}<div className="mt-3 flex items-center justify-between gap-1"><span className="truncate text-[11px] text-muted-foreground">{lead.nextContact ? `Retorno: ${format(lead.nextContact, "dd MMM", { locale: ptBR })}` : lead.source || "Sem origem"}</span><Select value={stage} onValueChange={(v) => v && onMove(lead.id, v as LeadStage)}><SelectTrigger size="sm" className="h-6 w-7 border-0 p-1 text-[0px]"><SelectValue /></SelectTrigger><SelectContent>{STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select></div></article>; }
function LeadEditor({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const [form, setForm] = useState<LeadInput>(lead ? { name: lead.name, company: lead.company, email: lead.email, phone: lead.phone, source: lead.source, stage: lead.stage, valueCents: lead.valueCents, notes: lead.notes, nextContact: lead.nextContact ? format(lead.nextContact, "yyyy-MM-dd") : "" } : emptyInput); const [isPending, startTransition] = useTransition(); const set = <K extends keyof LeadInput>(key: K, value: LeadInput[K]) => setForm((c) => ({ ...c, [key]: value }));
  const save = () => startTransition(async () => { try { if (lead) await updateLead(lead.id, form); else await createLead(form); toast.success(lead ? "Lead atualizado." : "Lead criado."); onClose(); } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); } });
  const remove = () => { if (lead && confirm(`Remover ${lead.name}?`)) startTransition(async () => { await deleteLead(lead.id); toast.success("Lead removido."); onClose(); }); };
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle><DialogDescription>Registre os dados e mantenha o próximo passo sempre visível.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><Field label="Nome *"><Input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Field><Field label="Empresa"><Input value={form.company ?? ""} onChange={(e) => set("company", e.target.value)} /></Field><Field label="E-mail"><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field><Field label="Telefone"><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field><Field label="Etapa"><Select value={form.stage} onValueChange={(v) => v && set("stage", v as LeadStage)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select></Field><Field label="Valor estimado (R$)"><Input type="number" min="0" step="0.01" value={form.valueCents ? (form.valueCents / 100).toFixed(2) : ""} onChange={(e) => set("valueCents", Math.round(Number(e.target.value.replace(",", ".")) * 100) || 0)} /></Field><Field label="Origem"><Input placeholder="Indicação, Instagram..." value={form.source ?? ""} onChange={(e) => set("source", e.target.value)} /></Field><Field label="Próximo contato"><Input type="date" value={form.nextContact ?? ""} onChange={(e) => set("nextContact", e.target.value)} /></Field></div><Field label="Observações"><Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Necessidades, contexto e próximos passos..." /></Field><div className="flex items-center justify-between gap-2 pt-2">{lead ? <Button variant="ghost" onClick={remove} disabled={isPending} className="text-destructive hover:text-destructive"><Trash2 /> Excluir</Button> : <span />}<div className="flex gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button className="bg-gradient-violet text-white" onClick={save} disabled={isPending || !form.name.trim()}>{isPending && <Loader2 className="animate-spin" />} Salvar lead</Button></div></div></DialogContent></Dialog>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-medium text-muted-foreground"><span>{label}</span>{children}</label>; }
