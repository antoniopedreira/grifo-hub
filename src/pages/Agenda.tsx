import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, LayoutGrid, List, Plus, User, Search, Building2, CircleDot, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { AgendaKanban } from "@/components/agenda/AgendaKanban";
import { AgendaList } from "@/components/agenda/AgendaList";
import { MissionSheet } from "@/components/agenda/MissionSheet";
import { TeamDelayRanking } from "@/components/agenda/TeamDelayRanking";
import { useStandbyAutomation } from "@/hooks/useStandbyAutomation";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

type ViewMode = "calendar" | "kanban" | "list";
type TeamMember = Tables<"team_members">;
type MissionStatus = Enums<"mission_status">;

const statuses: MissionStatus[] = ["Pendente", "Em Andamento", "Em Revisão", "Concluído", "Stand-by"];

export default function Agenda() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Executa automação Stand-by → Pendente ao carregar
  useStandbyAutomation();

  const { data: members = [] } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data as TeamMember[];
    },
  });

  // Busca departamentos únicos das missões
  const { data: departments = [] } = useQuery({
    queryKey: ["mission_departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_missions")
        .select("department")
        .not("department", "is", null);
      if (error) throw error;
      
      // Extrai departamentos únicos e ordena
      const uniqueDepts = [...new Set(data.map(m => m.department).filter(Boolean))] as string[];
      return uniqueDepts.sort((a, b) => a.localeCompare(b));
    },
  });

  const toggleArrayFilter = (arr: string[], value: string): string[] => {
    return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-bold text-primary">Agenda Operacional</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Bar */}
          <div className="relative w-full sm:w-[160px] lg:w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-background"
            />
          </div>

          {/* Department Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[130px] justify-start bg-background">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="truncate">
                  {departmentFilter.length === 0 ? "Setor" : departmentFilter.length === 1 ? departmentFilter[0] : `${departmentFilter.length} setores`}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2" align="start">
              <div className="space-y-1">
                {departments.map((dept) => (
                  <label key={dept} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={departmentFilter.includes(dept)}
                      onCheckedChange={() => setDepartmentFilter(toggleArrayFilter(departmentFilter, dept))}
                    />
                    <span className="text-sm">{dept}</span>
                  </label>
                ))}
                {departmentFilter.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 text-xs"
                    onClick={() => setDepartmentFilter([])}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Status Filter - Only visible in List view */}
          {viewMode === "list" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[140px] justify-start bg-background">
                  <CircleDot className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="truncate">
                    {statusFilter.length === 0 ? "Status" : statusFilter.length === 1 ? statusFilter[0] : `${statusFilter.length} status`}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[180px] p-2" align="start">
                <div className="space-y-1">
                  {statuses.map((status) => (
                    <label key={status} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={statusFilter.includes(status)}
                        onCheckedChange={() => setStatusFilter(toggleArrayFilter(statusFilter, status))}
                      />
                      <span className="text-sm">{status}</span>
                    </label>
                  ))}
                  {statusFilter.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1 text-xs"
                      onClick={() => setStatusFilter([])}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Owner Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[130px] justify-start bg-background">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="truncate">
                  {ownerFilter.length === 0 ? "Responsável" : ownerFilter.length === 1 ? members.find(m => m.id === ownerFilter[0])?.name || "1 pessoa" : `${ownerFilter.length} pessoas`}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2" align="start">
              <div className="space-y-1">
                {members.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={ownerFilter.includes(member.id)}
                      onCheckedChange={() => setOwnerFilter(toggleArrayFilter(ownerFilter, member.id))}
                    />
                    <span className="text-sm">{member.name}</span>
                  </label>
                ))}
                {ownerFilter.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 text-xs"
                    onClick={() => setOwnerFilter([])}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="border rounded-lg hidden sm:flex"
          >
            <ToggleGroupItem value="kanban" aria-label="Visualização Kanban" className="gap-2 px-3">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden lg:inline">Kanban</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Visualização Lista" className="gap-2 px-3">
              <List className="h-4 w-4" />
              <span className="hidden lg:inline">Lista</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Visualização Calendário" className="gap-2 px-3">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden lg:inline">Calendário</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            onClick={() => setSheetOpen(true)}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Missão
          </Button>
        </div>
      </div>

      {/* Content with optional ranking sidebar */}
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {viewMode === "calendar" ? (
            <AgendaCalendar 
              ownerFilter={ownerFilter.length > 0 ? ownerFilter : null} 
            />
          ) : viewMode === "list" ? (
            <AgendaList
              ownerFilter={ownerFilter.length > 0 ? ownerFilter : null}
              departmentFilter={departmentFilter.length > 0 ? departmentFilter : null}
              statusFilter={statusFilter.length > 0 ? statusFilter : null}
              searchTerm={searchTerm}
            />
          ) : (
            <AgendaKanban 
              ownerFilter={ownerFilter.length > 0 ? ownerFilter : null}
              departmentFilter={departmentFilter.length > 0 ? departmentFilter : null} 
              searchTerm={searchTerm} 
            />
          )}
        </div>

        {/* Ranking Sidebar - Only show in Kanban view */}
        {viewMode === "kanban" && (
          <div className="hidden xl:block w-72 flex-shrink-0">
            <TeamDelayRanking />
          </div>
        )}
      </div>

      {/* Mission Sheet */}
      <MissionSheet open={sheetOpen} onOpenChange={setSheetOpen} mission={null} />
    </div>
  );
}
