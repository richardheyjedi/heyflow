import "dotenv/config";
import { PrismaClient, TaskPriority, TaskStatus } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { addDays, subDays, setHours, setMinutes, startOfDay } from "date-fns";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

function at(daysFromToday: number, hour?: number, minute = 0) {
  const base = startOfDay(daysFromToday >= 0 ? addDays(new Date(), daysFromToday) : subDays(new Date(), -daysFromToday));
  if (hour === undefined) return base;
  return setMinutes(setHours(base, hour), minute);
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

  console.log("Criando categorias-base do financeiro...");
  // Só a taxonomia inicial — nenhum lançamento ou cliente fictício.
  const categorySeed: { name: string; group: "casa" | "pessoal" | "negocio" | "outro" }[] = [
    { name: "Contas de Casa", group: "casa" },
    { name: "Aluguel/Financiamento", group: "casa" },
    { name: "Mercado", group: "casa" },
    { name: "Transporte", group: "pessoal" },
    { name: "Saúde", group: "pessoal" },
    { name: "Lazer", group: "pessoal" },
    { name: "Educação", group: "pessoal" },
    { name: "Serviços Prestados", group: "negocio" },
    { name: "Fornecedores", group: "negocio" },
    { name: "Impostos", group: "negocio" },
    { name: "Salários", group: "negocio" },
    { name: "Assinaturas", group: "outro" },
    { name: "Outros", group: "outro" },
  ];
  await prisma.financeCategory.createMany({ data: categorySeed });

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
