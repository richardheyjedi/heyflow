import { GlobalSearch } from "@/components/taskflow/global-search";
import { NotificationsDropdown } from "@/components/taskflow/notifications-dropdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getNotifications } from "@/lib/data/notifications";

export async function Topbar() {
  const notifications = await getNotifications();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border/60 bg-background/70 px-6 py-3.5 backdrop-blur-xl">
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-3">
        <NotificationsDropdown notifications={notifications} />
        <Avatar className="size-9 border border-border/70">
          <AvatarFallback className="bg-gradient-violet text-xs font-semibold text-white">VC</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
