import "dotenv/config";
import { PrismaClient, TaskPriority, TaskStatus } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { addDays, addMonths, subDays, setDate, setHours, setMinutes, startOfDay, startOfMonth } from "date-fns";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

function at(daysFromToday: number, hour?: number, minute = 0) {
  const base = startOfDay(daysFromToday >= 0 ? addDays(new Date(), daysFromToday) : subDays(new Date(), -daysFromToday));
  if (hour === undefined) return base;
  return setMinutes(setHours(base, hour), minute);
}

function dayOfMonth(day: number, monthOffset = 0) {
  return setDate(startOfMonth(addMonths(new Date(), monthOffset)), day);
}

async function main() {
  console.log("Limpando dados existentes...");
  await prisma.financeReminder.deleteMany();
  await prisma.financeTransaction.deleteMany();
  await prisma.financeClient.deleteMany();
  await prisma.financeCategory.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.taskTag.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.project.deleteMany();

  console.log("Criando projetos...");
  const [redesign, mobile, marketing, infra] = await Promise.all([
    prisma.project.create({
      data: {
        name: "Redesign do Site",
        description: "Modernização completa da presença web institucional.",
        color: "#8B5CF6",
        icon: "Layout",
        deadline: at(9),
      },
    }),
    prisma.project.create({
      data: {
        name: "App Mobile",
        description: "Aplicativo nativo para iOS e Android.",
        color: "#A855F7",
        icon: "Smartphone",
        deadline: at(21),
      },
    }),
    prisma.project.create({
      data: {
        name: "Marketing Q3",
        description: "Campanhas e lançamentos do terceiro trimestre.",
        color: "#C084FC",
        icon: "Megaphone",
        deadline: at(-2),
      },
    }),
    prisma.project.create({
      data: {
        name: "Infraestrutura",
        description: "Observabilidade, CI/CD e confiabilidade.",
        color: "#6D28D9",
        icon: "Server",
      },
    }),
  ]);

  console.log("Criando tags...");
  const tagNames: { name: string; color: string }[] = [
    { name: "Urgente", color: "#FB7185" },
    { name: "Cliente", color: "#A855F7" },
    { name: "Interno", color: "#818CF8" },
    { name: "Bug", color: "#F87171" },
    { name: "Design", color: "#C084FC" },
    { name: "Backend", color: "#60A5FA" },
  ];
  const tags = await Promise.all(
    tagNames.map((t) => prisma.tag.create({ data: t }))
  );
  const tag = (name: string) => tags.find((t) => t.name === name)!;

  type SeedTask = {
    title: string;
    description?: string;
    projectId: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: Date | null;
    dueTime?: string | null;
    recurrenceRule?: "daily" | "weekly" | "monthly" | "weekdays" | null;
    completedAt?: Date | null;
    tags?: string[];
    subtasks?: { title: string; done: boolean }[];
  };

  const tasks: SeedTask[] = [
    // Redesign do Site
    {
      title: "Definir novo design system",
      description: "Consolidar tokens de cor, tipografia e espaçamento para o novo site.",
      projectId: redesign.id,
      status: TaskStatus.in_progress,
      priority: TaskPriority.high,
      dueDate: at(2),
      dueTime: "14:00",
      tags: ["Design", "Interno"],
      subtasks: [
        { title: "Paleta de cores", done: true },
        { title: "Escala tipográfica", done: true },
        { title: "Biblioteca de componentes", done: false },
        { title: "Documentar no Figma", done: false },
      ],
    },
    {
      title: "Revisar wireframes com o cliente",
      projectId: redesign.id,
      status: TaskStatus.todo,
      priority: TaskPriority.urgent,
      dueDate: at(-1),
      dueTime: "10:30",
      tags: ["Cliente", "Urgente"],
    },
    {
      title: "Corrigir bug de layout no Safari",
      description: "Grid quebra em telas menores que 1024px no Safari 17.",
      projectId: redesign.id,
      status: TaskStatus.todo,
      priority: TaskPriority.high,
      dueDate: at(-2),
      dueTime: "09:00",
      tags: ["Bug"],
    },
    {
      title: "Implementar página de preços",
      projectId: redesign.id,
      status: TaskStatus.todo,
      priority: TaskPriority.medium,
      dueDate: at(4),
      dueTime: null,
      subtasks: [
        { title: "Layout responsivo", done: false },
        { title: "Integração com dados de planos", done: false },
      ],
    },
    {
      title: "Publicar changelog semanal",
      projectId: redesign.id,
      status: TaskStatus.todo,
      priority: TaskPriority.low,
      dueDate: at(0),
      dueTime: "17:00",
      recurrenceRule: "weekly",
      tags: ["Interno"],
    },
    {
      title: "Otimizar imagens da home",
      projectId: redesign.id,
      status: TaskStatus.done,
      priority: TaskPriority.medium,
      dueDate: at(-5),
      completedAt: at(-5, 16),
      tags: ["Design"],
    },

    // App Mobile
    {
      title: "Configurar push notifications",
      projectId: mobile.id,
      status: TaskStatus.in_progress,
      priority: TaskPriority.high,
      dueDate: at(3),
      dueTime: "11:00",
      tags: ["Backend"],
      subtasks: [
        { title: "Configurar Firebase", done: true },
        { title: "Handler de background", done: false },
        { title: "Testes em dispositivo real", done: false },
      ],
    },
    {
      title: "Corrigir crash na tela de perfil",
      description: "Crash ao abrir perfil sem conexão de rede.",
      projectId: mobile.id,
      status: TaskStatus.todo,
      priority: TaskPriority.urgent,
      dueDate: at(-1),
      dueTime: "08:00",
      tags: ["Bug", "Urgente"],
    },
    {
      title: "Sincronização offline-first",
      projectId: mobile.id,
      status: TaskStatus.todo,
      priority: TaskPriority.high,
      dueDate: at(7),
      tags: ["Backend"],
    },
    {
      title: "Revisão de acessibilidade (VoiceOver/TalkBack)",
      projectId: mobile.id,
      status: TaskStatus.todo,
      priority: TaskPriority.medium,
      dueDate: at(5),
      dueTime: "15:00",
    },
    {
      title: "Rotina diária de build interno",
      projectId: mobile.id,
      status: TaskStatus.todo,
      priority: TaskPriority.low,
      dueDate: at(0),
      dueTime: "07:30",
      recurrenceRule: "daily",
      tags: ["Interno"],
    },
    {
      title: "Publicar versão 2.4.0 nas lojas",
      projectId: mobile.id,
      status: TaskStatus.done,
      priority: TaskPriority.high,
      dueDate: at(-3),
      completedAt: at(-3, 18),
    },

    // Marketing Q3
    {
      title: "Planejar lançamento de campanha",
      projectId: marketing.id,
      status: TaskStatus.in_progress,
      priority: TaskPriority.high,
      dueDate: at(1),
      dueTime: "13:00",
      tags: ["Cliente"],
      subtasks: [
        { title: "Definir público-alvo", done: true },
        { title: "Criativos para redes sociais", done: false },
        { title: "Aprovação jurídica", done: false },
      ],
    },
    {
      title: "Relatório de performance mensal",
      projectId: marketing.id,
      status: TaskStatus.todo,
      priority: TaskPriority.medium,
      dueDate: at(0),
      dueTime: null,
      recurrenceRule: "monthly",
      tags: ["Interno"],
    },
    {
      title: "Newsletter atrasada de junho",
      projectId: marketing.id,
      status: TaskStatus.todo,
      priority: TaskPriority.medium,
      dueDate: at(-4),
      dueTime: "09:00",
    },
    {
      title: "Gravar depoimentos de clientes",
      projectId: marketing.id,
      status: TaskStatus.todo,
      priority: TaskPriority.low,
      dueDate: at(9),
      tags: ["Cliente"],
    },
    {
      title: "Atualizar apresentação institucional",
      projectId: marketing.id,
      status: TaskStatus.done,
      priority: TaskPriority.low,
      dueDate: at(-7),
      completedAt: at(-6),
    },

    // Infraestrutura
    {
      title: "Configurar alertas de observabilidade",
      projectId: infra.id,
      status: TaskStatus.in_progress,
      priority: TaskPriority.high,
      dueDate: at(2),
      dueTime: "16:30",
      tags: ["Backend"],
      subtasks: [
        { title: "Dashboards de latência", done: true },
        { title: "Alertas de erro 5xx", done: false },
      ],
    },
    {
      title: "Rotação de credenciais expirando",
      projectId: infra.id,
      status: TaskStatus.todo,
      priority: TaskPriority.urgent,
      dueDate: at(-1),
      dueTime: "12:00",
      tags: ["Urgente", "Backend"],
    },
    {
      title: "Checklist diário de saúde dos serviços",
      projectId: infra.id,
      status: TaskStatus.todo,
      priority: TaskPriority.medium,
      dueDate: at(0),
      dueTime: "08:00",
      recurrenceRule: "weekdays",
      tags: ["Interno"],
    },
    {
      title: "Migrar pipeline de CI para cache remoto",
      projectId: infra.id,
      status: TaskStatus.todo,
      priority: TaskPriority.medium,
      dueDate: at(6),
    },
  ];

  console.log(`Criando ${tasks.length} tarefas...`);
  for (const t of tasks) {
    await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        projectId: t.projectId,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ?? null,
        dueTime: t.dueTime ?? null,
        recurrenceRule: t.recurrenceRule ?? null,
        completedAt: t.completedAt ?? null,
        tags: t.tags
          ? { create: t.tags.map((name) => ({ tag: { connect: { id: tag(name).id } } })) }
          : undefined,
        subtasks: t.subtasks
          ? {
              create: t.subtasks.map((s, i) => ({
                title: s.title,
                done: s.done,
                order: i,
              })),
            }
          : undefined,
      },
    });
  }

  console.log("Criando dados do financeiro...");
  const [acme, beta, joao, fornecedor] = await Promise.all([
    prisma.financeClient.create({ data: { name: "Acme Corp", color: "#A855F7", kind: "PJ" } }),
    prisma.financeClient.create({ data: { name: "Beta Studios", color: "#8B5CF6", kind: "PJ" } }),
    prisma.financeClient.create({ data: { name: "João Investidor", color: "#60A5FA", kind: "PF" } }),
    prisma.financeClient.create({ data: { name: "Fornecedor XPTO", color: "#F59E0B", kind: "PJ" } }),
  ]);

  const categoryNames = [
    "Aluguel",
    "Impostos",
    "Fornecedores",
    "Assinaturas",
    "Alimentação",
    "Serviços prestados",
    "Salários",
    "Transporte",
    "Outros",
  ];
  await prisma.financeCategory.createMany({ data: categoryNames.map((name) => ({ name })) });

  type SeedFinanceTransaction = {
    kind: "receita" | "despesa";
    scope: "PF" | "PJ";
    description: string;
    amountCents: number;
    category: string;
    clientId?: string | null;
    dueDate: Date;
    paidAt?: Date | null;
    status: "pago" | "nao_pago" | "pendente";
    recurrenceFrequency?: "semanal" | "quinzenal" | "mensal" | "anual" | null;
    recurrenceInterval?: number | null;
    recurrenceNextDate?: Date | null;
  };

  const financeTransactions: SeedFinanceTransaction[] = [
    // Receitas
    {
      kind: "receita",
      scope: "PJ",
      description: "Consultoria mensal — Acme Corp",
      amountCents: 850000,
      category: "Serviços prestados",
      clientId: acme.id,
      dueDate: dayOfMonth(10),
      status: "pendente",
      recurrenceFrequency: "mensal",
      recurrenceInterval: 1,
      recurrenceNextDate: dayOfMonth(10, 1),
    },
    {
      kind: "receita",
      scope: "PJ",
      description: "Projeto de design — Beta Studios",
      amountCents: 420000,
      category: "Serviços prestados",
      clientId: beta.id,
      dueDate: dayOfMonth(2),
      paidAt: dayOfMonth(2),
      status: "pago",
    },
    {
      kind: "receita",
      scope: "PF",
      description: "Consultoria pontual — João Investidor",
      amountCents: 150000,
      category: "Serviços prestados",
      clientId: joao.id,
      dueDate: dayOfMonth(7),
      status: "pendente",
    },
    {
      kind: "receita",
      scope: "PJ",
      description: "Suporte técnico — Acme Corp",
      amountCents: 90000,
      category: "Serviços prestados",
      clientId: acme.id,
      dueDate: dayOfMonth(1),
      status: "nao_pago",
    },
    {
      kind: "receita",
      scope: "PJ",
      description: "Retainer mensal — Beta Studios",
      amountCents: 320000,
      category: "Serviços prestados",
      clientId: beta.id,
      dueDate: dayOfMonth(20),
      status: "pendente",
      recurrenceFrequency: "mensal",
      recurrenceInterval: 1,
      recurrenceNextDate: dayOfMonth(20, 1),
    },

    // Despesas PJ
    {
      kind: "despesa",
      scope: "PJ",
      description: "Aluguel do escritório",
      amountCents: 280000,
      category: "Aluguel",
      dueDate: dayOfMonth(5),
      paidAt: dayOfMonth(4),
      status: "pago",
      recurrenceFrequency: "mensal",
      recurrenceInterval: 1,
      recurrenceNextDate: dayOfMonth(5, 1),
    },
    {
      kind: "despesa",
      scope: "PJ",
      description: "Internet e telefonia",
      amountCents: 25000,
      category: "Assinaturas",
      dueDate: dayOfMonth(8),
      status: "nao_pago",
      recurrenceFrequency: "mensal",
      recurrenceInterval: 1,
      recurrenceNextDate: dayOfMonth(8, 1),
    },
    {
      kind: "despesa",
      scope: "PJ",
      description: "Assinatura Figma",
      amountCents: 18000,
      category: "Assinaturas",
      dueDate: dayOfMonth(10),
      status: "nao_pago",
      recurrenceFrequency: "mensal",
      recurrenceInterval: 1,
      recurrenceNextDate: dayOfMonth(10, 1),
    },
    {
      kind: "despesa",
      scope: "PJ",
      description: "Matéria-prima — Fornecedor XPTO",
      amountCents: 610000,
      category: "Fornecedores",
      clientId: fornecedor.id,
      dueDate: dayOfMonth(15),
      status: "pendente",
    },
    {
      kind: "despesa",
      scope: "PJ",
      description: "Impostos (DAS)",
      amountCents: 95000,
      category: "Impostos",
      dueDate: dayOfMonth(20),
      status: "nao_pago",
      recurrenceFrequency: "mensal",
      recurrenceInterval: 1,
      recurrenceNextDate: dayOfMonth(20, 1),
    },
    {
      kind: "despesa",
      scope: "PJ",
      description: "Energia elétrica",
      amountCents: 34000,
      category: "Outros",
      dueDate: dayOfMonth(10),
      status: "nao_pago",
      recurrenceFrequency: "mensal",
      recurrenceInterval: 1,
      recurrenceNextDate: dayOfMonth(10, 1),
    },
    {
      kind: "despesa",
      scope: "PJ",
      description: "Contador",
      amountCents: 60000,
      category: "Serviços prestados",
      dueDate: dayOfMonth(6),
      paidAt: dayOfMonth(5),
      status: "pago",
      recurrenceFrequency: "mensal",
      recurrenceInterval: 1,
      recurrenceNextDate: dayOfMonth(6, 1),
    },

    // Despesas PF
    {
      kind: "despesa",
      scope: "PF",
      description: "Aluguel apartamento",
      amountCents: 220000,
      category: "Aluguel",
      dueDate: dayOfMonth(5),
      status: "nao_pago",
      recurrenceFrequency: "mensal",
      recurrenceInterval: 1,
      recurrenceNextDate: dayOfMonth(5, 1),
    },
    {
      kind: "despesa",
      scope: "PF",
      description: "Supermercado",
      amountCents: 78000,
      category: "Alimentação",
      dueDate: dayOfMonth(3),
      paidAt: dayOfMonth(3),
      status: "pago",
    },
    {
      kind: "despesa",
      scope: "PF",
      description: "Plano de saúde",
      amountCents: 65000,
      category: "Outros",
      dueDate: dayOfMonth(25),
      status: "nao_pago",
      recurrenceFrequency: "mensal",
      recurrenceInterval: 1,
      recurrenceNextDate: dayOfMonth(25, 1),
    },
    {
      kind: "despesa",
      scope: "PF",
      description: "Fatura cartão de crédito",
      amountCents: 340000,
      category: "Outros",
      dueDate: dayOfMonth(2),
      status: "nao_pago",
    },
    {
      kind: "despesa",
      scope: "PF",
      description: "Streaming (Netflix + Spotify)",
      amountCents: 6500,
      category: "Assinaturas",
      dueDate: dayOfMonth(12),
      paidAt: dayOfMonth(11),
      status: "pago",
      recurrenceFrequency: "mensal",
      recurrenceInterval: 1,
      recurrenceNextDate: dayOfMonth(12, 1),
    },
  ];

  for (const t of financeTransactions) {
    await prisma.financeTransaction.create({
      data: {
        kind: t.kind,
        scope: t.scope,
        description: t.description,
        amountCents: t.amountCents,
        category: t.category,
        clientId: t.clientId ?? null,
        dueDate: t.dueDate,
        paidAt: t.paidAt ?? null,
        status: t.status,
        recurrenceFrequency: t.recurrenceFrequency ?? null,
        recurrenceInterval: t.recurrenceInterval ?? null,
        recurrenceNextDate: t.recurrenceNextDate ?? null,
      },
    });
  }

  console.log("Seed concluído com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
