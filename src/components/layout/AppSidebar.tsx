import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Package,
  Megaphone,
  FileText,
  Settings,
  CalendarDays,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import grifoLogo from "@/assets/grifo-logo.png";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Pipeline", url: "/pipeline", icon: GitBranch },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Templates", url: "/templates", icon: FileText },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className="border-r-0 bg-sidebar">
      {/* Logo Header */}
      <SidebarHeader className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {/* Grifo Logo */}
          <div className="w-11 h-11 rounded-xl bg-sidebar-accent flex items-center justify-center p-1.5">
            <img 
              src={grifoLogo} 
              alt="Grifo Academy" 
              className="h-full w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground text-lg leading-tight tracking-tight">
              Grifo Academy
            </h1>
            <p className="text-xs text-sidebar-foreground/60 font-medium">Hub</p>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="relative h-11 px-3 rounded-xl transition-all duration-200 group"
                    >
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 ${
                          active
                            ? "bg-white/10 text-sidebar-foreground"
                            : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
                        }`}
                      >
                        {/* Gold accent bar for active item */}
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r-full" />
                        )}
                        <item.icon
                          className={`h-5 w-5 transition-colors ${
                            active ? "text-sidebar-primary" : "group-hover:text-sidebar-primary"
                          }`}
                        />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
