import { Sidebar } from "@/components/taskflow/sidebar";
import { Topbar } from "@/components/taskflow/topbar";
import { TaskModal } from "@/components/taskflow/task-modal";
import { ProjectModal } from "@/components/taskflow/project-modal";
import { getProjects } from "@/lib/data/projects";
import { getTags } from "@/lib/data/tags";
import { generateDueNotifications } from "@/lib/data/notifications";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await generateDueNotifications();
  const [projects, tags] = await Promise.all([getProjects(), getTags()]);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar projects={projects} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-6 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <TaskModal projects={projects} initialTags={tags} />
      <ProjectModal />
    </div>
  );
}
