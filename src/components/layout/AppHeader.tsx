import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shadow-sm">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
    </header>
  );
}
