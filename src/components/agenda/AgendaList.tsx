import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isBefore, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, AlertCircle, Repeat, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { MissionSheet } from "./MissionSheet";
import { toast } from "sonner";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Mission = Tables<"team_missions">;
type TeamMember = Tables<"team_members">;
type MissionStatus = Enums<"mission_status">;

const statusColors: Record<MissionStatus, string> = {
  Pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Em Andamento": "bg-blue-100 text-blue-800 border-blue-200",
  "Em Revisão": "bg-purple-100 text-purple-800 border-purple-200",
  Concluído: "bg-green-100 text-green-800 border-green-200",
  "Stand-by": "bg-gray-100 text-gray-800 border-gray-200",
};

const departmentColors: Record<string, string> = {
  Marketing: "bg-pink-100 text-pink-800",
  Comercial: "bg-blue-100 text-blue-800",
  Produto: "bg-green-100 text-green-800",
  Admin: "bg-gray-100 text-gray-800",
  Financeiro: "bg-yellow-100 text-yellow-800",
};

type SortField = "mission" | "status" | "department" | "deadline" | "owner";
type SortDirection = "asc" | "desc";

interface AgendaListProps {
  ownerFilter: string | null;
  departmentFilter: string | null;
  searchTerm?: string;
}

export function AgendaList({ ownerFilter, departmentFilter, searchTerm = "" }: AgendaListProps) {
  const queryClient = useQueryClient();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("deadline");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data: missions = [] } = useQuery({
    queryKey: ["team_missions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_missions")
        .select("*")
        .order("deadline", { ascending: true });
      if (error) throw error;
      return data as Mission[];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*");
      if (error) throw error;
      return data as TeamMember[];
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MissionStatus }) => {
      const { error } = await supabase.from("team_missions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_missions"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const getMemberById = (memberId: string | null) => {
    if (!memberId) return null;
    return members.find((m) => m.id === memberId) || null;
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter missions
  const filteredMissions = missions.filter((m) => {
    const matchesOwner = ownerFilter ? m.owner_id === ownerFilter : true;
    const matchesDepartment = departmentFilter ? m.department === departmentFilter : true;
    const matchesSearch = searchTerm
      ? m.mission?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesOwner && matchesDepartment && matchesSearch;
  });

  // Sort missions
  const sortedMissions = [...filteredMissions].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "mission":
        comparison = (a.mission || "").localeCompare(b.mission || "");
        break;
      case "status":
        comparison = (a.status || "").localeCompare(b.status || "");
        break;
      case "department":
        comparison = (a.department || "").localeCompare(b.department || "");
        break;
      case "deadline":
        if (!a.deadline && !b.deadline) comparison = 0;
        else if (!a.deadline) comparison = 1;
        else if (!b.deadline) comparison = -1;
        else comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        break;
      case "owner":
        const ownerA = getMemberById(a.owner_id)?.name || "";
        const ownerB = getMemberById(b.owner_id)?.name || "";
        comparison = ownerA.localeCompare(ownerB);
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleMissionClick = (mission: Mission) => {
    setSelectedMission(mission);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setSelectedMission(null);
  };

  const handleToggleComplete = (mission: Mission, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus: MissionStatus = mission.status === "Concluído" ? "Pendente" : "Concluído";
    toggleStatusMutation.mutate({ id: mission.id, status: newStatus });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-semibold hover:bg-transparent"
                  onClick={() => handleSort("mission")}
                >
                  Missão <SortIcon field="mission" />
                </Button>
              </TableHead>
              <TableHead className="w-32">
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-semibold hover:bg-transparent"
                  onClick={() => handleSort("status")}
                >
                  Status <SortIcon field="status" />
                </Button>
              </TableHead>
              <TableHead className="w-28">
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-semibold hover:bg-transparent"
                  onClick={() => handleSort("department")}
                >
                  Setor <SortIcon field="department" />
                </Button>
              </TableHead>
              <TableHead className="w-40">
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-semibold hover:bg-transparent"
                  onClick={() => handleSort("owner")}
                >
                  Responsável <SortIcon field="owner" />
                </Button>
              </TableHead>
              <TableHead className="w-28">
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-semibold hover:bg-transparent"
                  onClick={() => handleSort("deadline")}
                >
                  Prazo <SortIcon field="deadline" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma missão encontrada
                </TableCell>
              </TableRow>
            ) : (
              sortedMissions.map((mission) => {
                const owner = getMemberById(mission.owner_id);
                const deadlineDate = mission.deadline ? parseISO(mission.deadline) : null;
                const isOverdue =
                  deadlineDate &&
                  isBefore(deadlineDate, new Date()) &&
                  !isToday(deadlineDate) &&
                  mission.status !== "Concluído";
                const missionData = mission as any;

                return (
                  <TableRow
                    key={mission.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                      mission.status === "Concluído" && "opacity-60"
                    )}
                    onClick={() => handleMissionClick(mission)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={mission.status === "Concluído"}
                        onCheckedChange={() =>
                          toggleStatusMutation.mutate({
                            id: mission.id,
                            status: mission.status === "Concluído" ? "Pendente" : "Concluído",
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-medium",
                            mission.status === "Concluído" && "line-through"
                          )}
                        >
                          {mission.mission}
                        </span>
                        {missionData.is_recurring && (
                          <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs border", statusColors[mission.status || "Pendente"])}
                      >
                        {mission.status || "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {mission.department && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            departmentColors[mission.department] || "bg-gray-100 text-gray-800"
                          )}
                        >
                          {mission.department}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {owner && (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                              {getInitials(owner.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">{owner.name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {mission.deadline && (
                        <div
                          className={cn(
                            "flex items-center gap-1 text-sm",
                            isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                          )}
                        >
                          {isOverdue ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" />
                          )}
                          {format(deadlineDate!, "dd/MM/yy", { locale: ptBR })}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      <MissionSheet open={sheetOpen} onOpenChange={handleCloseSheet} mission={selectedMission} />
    </Card>
  );
}
