import { LogOut } from "lucide-react";
import { GlobalSearch } from "@/components/taskflow/global-search";
import { MobileMenuButton } from "@/components/taskflow/mobile-menu-button";
import { NotificationsDropdown } from "@/components/taskflow/notifications-dropdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNotifications } from "@/lib/data/notifications";
import { logout } from "@/lib/auth/actions";

export async function Topbar() {
  const notifications = await getNotifications();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3.5 backdrop-blur-xl md:gap-4 md:px-6">
      <MobileMenuButton />
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-3">
        <NotificationsDropdown notifications={notifications} />
        <DropdownMenu>
          <DropdownMenuTrigger render={<button className="rounded-full" />}>
            <Avatar className="size-9 border border-border/70">
              <AvatarFallback className="bg-gradient-violet text-xs font-semibold text-white">VC</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <form action={logout}>
              <DropdownMenuItem nativeButton render={<button type="submit" className="w-full" />}>
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
