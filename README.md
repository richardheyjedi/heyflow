# TaskFlow

Gerenciamento de tarefas e projetos com visão por dia, semana e mês. SaaS interno, dark-first, paleta roxo + preto.

## Stack

- **Next.js 16** (App Router, TypeScript, `src/`), React 19
- **Tailwind CSS v4** + **shadcn/ui** (tema customizado roxo/preto)
- **Prisma ORM 7** + **SQLite** (via driver adapter `@prisma/adapter-libsql`), pronto para trocar para PostgreSQL
- **date-fns**, **lucide-react**, **recharts**, **@dnd-kit**, **zustand**

## Instalação

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

O banco SQLite é criado em `dev.db` na raiz do projeto. O comando de seed recria os projetos, tags e ~20 tarefas de demonstração (com subtarefas, recorrências, atrasos e concluídas) — pode ser rodado novamente a qualquer momento para resetar os dados.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | ESLint |
| `npx prisma studio` | Inspecionar o banco visualmente |
| `npx prisma migrate dev` | Aplicar migrações |
| `npx prisma db seed` | Repopular dados de demonstração |
| `npm test` | Roda os testes unitários das funções de cálculo do módulo Financeiro |

## Estrutura

```
prisma/
  schema.prisma       Modelos: Project, Task, Subtask, Tag, Notification, FinanceTransaction, FinanceClient, FinanceCategory, FinanceReminder
  seed.ts             Dados de demonstração (tarefas e financeiro)
src/
  app/
    layout.tsx         Layout raiz (fontes, tema dark, toaster)
    (app)/             Rotas com sidebar + topbar
      page.tsx          Dashboard "/"
      dia/               "/dia"
      semana/            "/semana"
      mes/               "/mes"
      projetos/[id]/     "/projetos/[id]"
      financeiro/        "/financeiro" (módulo Financeiro, ver abaixo)
  components/
    ui/                 Base shadcn/ui (customizada)
    taskflow/           Componentes de domínio (sidebar, topbar, task-card, modais, gráficos...)
    finance/            Componentes do módulo Financeiro
  lib/
    data/               Leituras (Prisma) usadas nos Server Components
    actions/            Server Actions (mutações: tasks, projects, tags, notifications)
    prisma.ts           Cliente Prisma singleton (driver adapter libSQL)
    recurrence.ts        Cálculo da próxima ocorrência de tarefas recorrentes
    notifications/web-push.ts  Stub isolado para plugar Web Push real no futuro
    finance/            Módulo Financeiro (ver seção própria abaixo)
  store/
    ui-store.ts         Estado global leve (zustand): modais, sidebar
```

## Módulo Financeiro (`/financeiro`)

Fluxo de caixa simples com PF + PJ juntos: lançamentos (receitas/despesas), recorrência, cortes de pagamento, indicador de "mês quitado", projeção de saldo, DRE simplificado e cobrança integrada ao TaskFlow. **Persistido no Prisma/SQLite**, mesmo padrão do resto do app (Server Components + Server Actions).

- `src/lib/finance/types.ts` — tipos de domínio (`Transaction`, `RecurrenceRule`, `Client`, `Reminder`) usados por toda a UI e por `calculations.ts`.
- `src/lib/finance/mappers.ts` — converte linhas do Prisma (recorrência "achatada" em colunas) para os tipos de domínio.
- `src/lib/finance/data.ts` — leituras (Server Components): `getFinanceTransactions`, `getFinanceClients`, `getFinanceCategories`.
- `src/lib/finance/actions.ts` — Server Actions (mutações): create/update/delete/duplicate de lançamento, marcar pago/não pago (gera a próxima ocorrência automaticamente se for recorrente), criar categoria/cliente, e `scheduleFinanceReminder` — que chama a Server Action `createTask` existente do TaskFlow para criar uma Task real quando você clica em "Programar cobrança".
- `src/lib/finance/calculations.ts` — todas as regras de negócio como funções puras (cortes de pagamento, mês quitado, totais, projeção, DRE, breakdown por grupo, CSV), independentes da fonte de dados. Cobertas por `calculations.test.ts` (`npm test`).

Os componentes (`src/components/finance/`) recebem os dados via props a partir da página (Server Component) e chamam as Server Actions diretamente — não há mais estado global (Zustand) para os dados financeiros, só a UI local de cada tela (filtros, qual modal está aberto).

**Categorias por grupo**: cada categoria pertence a um grupo — `casa` (contas domésticas: água, luz, aluguel, mercado...), `pessoal`, `negocio` ou `outro`. Gerencie pelo botão "Categorias" na aba Lançamentos (renomear, trocar grupo, excluir — renomear atualiza automaticamente os lançamentos existentes). O grupo alimenta o filtro por grupo, o badge colorido de cada categoria e o painel "Despesas por grupo" na Visão Geral.

**Lançamentos em planilha**: a aba Lançamentos é uma tabela densa e ordenável (clique no cabeçalho da coluna) com edição inline de Categoria e Status direto na célula — sem precisar abrir o modal para essas duas mudanças rápidas. Selecione várias linhas pelo checkbox (ou o checkbox do cabeçalho para selecionar tudo o que está filtrado) para marcar como pago/não pago ou excluir em lote.

**Orçamento por grupo**: defina um limite mensal por grupo de categoria (botão do cofrinho ao lado de "Orçamento por grupo" na Visão Geral). A barra de progresso fica âmbar perto do limite e vermelha ao estourar; o cálculo é feito por `getBudgetStatus` em `calculations.ts`.

**Alertas automáticos**: um job (`src/lib/finance/notifications.ts`, chamado em `(app)/layout.tsx` junto com o job de tarefas) roda a cada carregamento e gera notificações no mesmo sino do TaskFlow para três situações: mês quitado, corte de pagamento a menos de 3 dias com saldo pendente, e orçamento de grupo estourado. Cada uma é única por mês (identificada por um marcador na mensagem) e é *atualizada* em vez de duplicada se os valores mudarem.

O app nasce sem nenhum lançamento, cliente, transação ou orçamento de exemplo — só a taxonomia inicial de categorias (incluindo "Contas de Casa"). Comece cadastrando seus lançamentos reais.

## Trocar para PostgreSQL

1. Em `prisma/schema.prisma`, mude `provider = "sqlite"` para `provider = "postgresql"` no bloco `datasource`.
2. Troque o adapter em `src/lib/prisma.ts` e `prisma/seed.ts` de `@prisma/adapter-libsql` para `@prisma/adapter-pg` (ou outro adapter compatível), e ajuste `DATABASE_URL` no `.env` para a connection string do Postgres.
3. Rode `npx prisma migrate dev` novamente.

## Notas

- Notificações in-app são geradas automaticamente (tarefas atrasadas ou vencendo em até 24h) a cada carregamento — não depende de cron real. O ponto de extensão para Web Push real está isolado em `src/lib/notifications/web-push.ts`.
- Tarefas recorrentes geram automaticamente a próxima ocorrência ao serem concluídas.
- Drag-and-drop está disponível na visão Semana (mover tarefas entre dias) e na página de Projeto (mover entre colunas do Kanban).
