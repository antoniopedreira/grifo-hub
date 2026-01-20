import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, LayoutGrid, List, Plus, User, Search, Building2, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { AgendaKanban } from "@/components/agenda/AgendaKanban";
import { AgendaList } from "@/components/agenda/AgendaList";
import { MissionSheet } from "@/components/agenda/MissionSheet";
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
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[130px] bg-background">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent className="min-w-[--radix-select-trigger-width]">
              <SelectItem value="all">Todos</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter - Only visible in List view */}
          {viewMode === "list" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-background">
                <CircleDot className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="min-w-[--radix-select-trigger-width]">
                <SelectItem value="all">Todos</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Owner Filter */}
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[130px] bg-background">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent className="min-w-[--radix-select-trigger-width]">
              <SelectItem value="all">Todos</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

      {/* Content */}
      {viewMode === "calendar" ? (
        <AgendaCalendar 
          ownerFilter={ownerFilter === "all" ? null : ownerFilter} 
        />
      ) : viewMode === "list" ? (
        <AgendaList
          ownerFilter={ownerFilter === "all" ? null : ownerFilter}
          departmentFilter={departmentFilter === "all" ? null : departmentFilter}
          statusFilter={statusFilter === "all" ? null : statusFilter}
          searchTerm={searchTerm}
        />
      ) : (
        <AgendaKanban 
          ownerFilter={ownerFilter === "all" ? null : ownerFilter}
          departmentFilter={departmentFilter === "all" ? null : departmentFilter} 
          searchTerm={searchTerm} 
        />
      )}

      {/* Mission Sheet */}
      <MissionSheet open={sheetOpen} onOpenChange={setSheetOpen} mission={null} />
    </div>
  );
}
