import { getProjects } from "@/lib/data/projects";
import { ProjectsGrid } from "@/components/taskflow/projects-grid";

export default async function ProjetosPage() {
  const projects = await getProjects();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projetos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos os seus projetos de clientes e pessoais em um só lugar.
        </p>
      </div>

      <ProjectsGrid projects={projects} />
    </div>
  );
}
