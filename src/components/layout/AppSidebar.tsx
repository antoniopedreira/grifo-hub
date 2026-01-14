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
  useSidebar,
} from "@/components/ui/sidebar";
import grifoLogo from "@/assets/grifo-logo.png";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-sidebar">
      {/* Logo Header */}
      <SidebarHeader className={`border-b border-sidebar-border transition-all duration-200 ${isCollapsed ? "p-3" : "p-5"}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          {/* Grifo Logo */}
          <div className={`rounded-xl bg-sidebar-accent flex items-center justify-center transition-all duration-200 ${isCollapsed ? "w-9 h-9 p-1" : "w-11 h-11 p-1.5"}`}>
            <img 
              src={grifoLogo} 
              alt="Grifo Academy" 
              className="h-full w-auto object-contain"
            />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-sidebar-foreground text-lg leading-tight tracking-tight">
                Grifo Academy
              </h1>
              <p className="text-xs text-sidebar-foreground/60 font-medium">Hub</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className={`py-6 transition-all duration-200 ${isCollapsed ? "px-1.5" : "px-3"}`}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const active = isActive(item.url);
                const Icon = item.icon;
                
                const menuContent = (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={`relative h-11 rounded-xl transition-all duration-200 ${isCollapsed ? "px-0 justify-center" : "px-3"}`}
                    >
                      <NavLink
                        to={item.url}
                        className={`group/item flex items-center gap-3 w-full ${
                          active
                            ? "bg-white/10 text-sidebar-foreground"
                            : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
                        }`}
                      >
                        {/* Gold accent bar for active item */}
                        {active && !isCollapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r-full" />
                        )}
                        {active && isCollapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sidebar-primary rounded-r-full" />
                        )}
                        <Icon
                          className={`h-5 w-5 shrink-0 transition-colors duration-200 ${
                            active 
                              ? "text-sidebar-primary" 
                              : "text-sidebar-foreground/70 group-hover/item:text-sidebar-primary"
                          }`}
                        />
                        {!isCollapsed && (
                          <span className={`font-medium transition-colors duration-200 ${
                            active 
                              ? "text-sidebar-foreground" 
                              : "group-hover/item:text-sidebar-foreground"
                          }`}>
                            {item.title}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                // When collapsed, wrap with Tooltip for better UX
                if (isCollapsed) {
                  return (
                    <Tooltip key={item.title} delayDuration={0}>
                      <TooltipTrigger asChild>
                        {menuContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-sidebar text-sidebar-foreground border-sidebar-border">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.title}>{menuContent}</div>;
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
