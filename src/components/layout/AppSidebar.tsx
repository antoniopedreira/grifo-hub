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
  UserCheck,
  LogOut,
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
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
  { title: "CRM", url: "/crm", icon: UserCheck },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Templates", url: "/templates", icon: FileText },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-sidebar">
      {/* Logo Header */}
      <SidebarHeader className={`border-b border-sidebar-border transition-all duration-200 ${isCollapsed ? "p-2 flex items-center justify-center" : "p-5"}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          {/* Grifo Logo */}
          <img 
            src={grifoLogo} 
            alt="Grifo Academy" 
            className={`object-contain transition-all duration-200 ${isCollapsed ? "w-8 h-8" : "w-12 h-12"}`}
          />
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-sidebar-foreground text-xl leading-tight tracking-tight">
                GrifoHub
              </h1>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className={`py-6 transition-all duration-200 ${isCollapsed ? "px-0" : "px-3"}`}>
        <SidebarGroup className={isCollapsed ? "p-0" : ""}>
          <SidebarGroupContent>
            <SidebarMenu className={`space-y-1 ${isCollapsed ? "items-center" : ""}`}>
              {menuItems.map((item) => {
                const active = isActive(item.url);
                const Icon = item.icon;
                
                const menuContent = (
                  <SidebarMenuItem key={item.title} className={isCollapsed ? "flex justify-center w-full" : ""}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={`relative rounded-xl transition-all duration-200 ${isCollapsed ? "h-10 w-10 p-0 flex items-center justify-center" : "h-11 px-3"}`}
                    >
                      <NavLink
                        to={item.url}
                        className={`group/item flex items-center w-full ${
                          isCollapsed ? "justify-center" : "gap-3"
                        } ${
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
                          <span className="absolute left-1 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sidebar-primary rounded-full" />
                        )}
                        <Icon
                          className={`shrink-0 transition-colors duration-200 ${
                            isCollapsed ? "h-5 w-5" : "h-5 w-5"
                          } ${
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

      {/* User Profile Footer */}
      <SidebarFooter className={`border-t border-sidebar-border transition-all duration-200 ${isCollapsed ? "p-2" : "p-4"}`}>
        <div className={`flex items-center ${isCollapsed ? "flex-col gap-2" : "gap-3"}`}>
          <div className="w-9 h-9 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-sidebar-primary-foreground">
              {getUserInitials()}
            </span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.email || "Usuário"}
              </p>
            </div>
          )}
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="h-9 w-9 text-sidebar-foreground/70 hover:text-sidebar-primary hover:bg-white/5"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-sidebar text-sidebar-foreground border-sidebar-border">
                Sair
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-9 w-9 text-sidebar-foreground/70 hover:text-sidebar-primary hover:bg-white/5 shrink-0"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
