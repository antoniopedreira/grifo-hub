import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { format, isBefore, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { MissionSheet } from "./MissionSheet";
import { toast } from "sonner";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Mission = Tables<"team_missions">;
type TeamMember = Tables<"team_members">;
type MissionStatus = Enums<"mission_status">;

const columns: { id: MissionStatus; title: string; color: string }[] = [
  { id: "Pendente", title: "Pendente", color: "bg-yellow-500" },
  { id: "Em Andamento", title: "Em Andamento", color: "bg-blue-500" },
  { id: "Em Revisão", title: "Em Revisão", color: "bg-purple-500" },
  { id: "Concluído", title: "Concluído", color: "bg-green-500" },
  { id: "Stand-by", title: "Stand-by", color: "bg-gray-500" },
];

const departmentColors: Record<string, string> = {
  Marketing: "bg-pink-100 text-pink-800",
  Comercial: "bg-blue-100 text-blue-800",
  Produto: "bg-green-100 text-green-800",
  Admin: "bg-gray-100 text-gray-800",
  Financeiro: "bg-yellow-100 text-yellow-800",
};

export function AgendaKanban() {
  const queryClient = useQueryClient();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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
      const { data, error } = await supabase
        .from("team_members")
        .select("*");
      if (error) throw error;
      return data as TeamMember[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MissionStatus }) => {
      const { error } = await supabase
        .from("team_missions")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_missions"] });
      toast.success("Status atualizado!");
    },
  });

  const getMemberById = (memberId: string | null) => {
    if (!memberId) return null;
    return members.find((m) => m.id === memberId) || null;
  };

  const getSupportMembers = (supportIds: string[] | null) => {
    if (!supportIds || supportIds.length === 0) return [];
    return supportIds
      .map((id) => members.find((m) => m.id === id))
      .filter((m): m is TeamMember => m !== undefined);
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

  const getMissionsByStatus = (status: MissionStatus) => {
    return missions.filter((m) => m.status === status);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const missionId = result.draggableId;
    const newStatus = result.destination.droppableId as MissionStatus;

    updateMutation.mutate({ id: missionId, status: newStatus });
  };

  const handleMissionClick = (mission: Mission) => {
    setSelectedMission(mission);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setSelectedMission(null);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 min-w-0 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnMissions = getMissionsByStatus(column.id);

          return (
            <div key={column.id} className="flex-shrink-0 w-72">
              <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <span className={cn("w-3 h-3 rounded-full", column.color)} />
                    {column.title}
                    <Badge variant="secondary" className="ml-auto">
                      {columnMissions.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "min-h-[400px] space-y-3 transition-colors rounded-lg p-1",
                          snapshot.isDraggingOver && "bg-secondary/10"
                        )}
                      >
                        {columnMissions.map((mission, index) => {
                          const owner = getMemberById(mission.owner_id);
                          const supportMembers = getSupportMembers((mission as any).support_ids);
                          // Parse date-only string correctly to avoid timezone offset issues
                          const deadlineDate = mission.deadline ? parseISO(mission.deadline) : null;
                          const isOverdue =
                            deadlineDate &&
                            isBefore(deadlineDate, new Date()) &&
                            !isToday(deadlineDate) &&
                            mission.status !== "Concluído";

                          return (
                            <Draggable key={mission.id} draggableId={mission.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => handleMissionClick(mission)}
                                  className={cn(
                                    "bg-background rounded-lg border p-3 cursor-pointer transition-shadow hover:shadow-md",
                                    snapshot.isDragging && "shadow-lg rotate-2"
                                  )}
                                >
                                  <h4 className="font-medium text-sm mb-2 line-clamp-2">
                                    {mission.mission}
                                  </h4>

                                  {mission.department && (
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        "text-xs mb-2",
                                        departmentColors[mission.department] || "bg-gray-100 text-gray-800"
                                      )}
                                    >
                                      {mission.department}
                                    </Badge>
                                  )}

                                  <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-2">
                                      {owner && (
                                        <Avatar className="h-7 w-7" title={`Responsável: ${owner.name}`}>
                                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                                            {getInitials(owner.name)}
                                          </AvatarFallback>
                                        </Avatar>
                                      )}
                                      {supportMembers.length > 0 && (
                                        <span 
                                          className="text-[11px] text-muted-foreground font-medium tracking-wide"
                                          title={`Apoio: ${supportMembers.map(s => s.name).join(', ')}`}
                                        >
                                          {supportMembers.map(s => getInitials(s.name)).join(' ')}
                                        </span>
                                      )}
                                    </div>

                                    {mission.deadline && (
                                      <div
                                        className={cn(
                                          "flex items-center gap-1 text-xs",
                                          isOverdue ? "text-destructive" : "text-muted-foreground"
                                        )}
                                      >
                                        {isOverdue ? (
                                          <AlertCircle className="h-3 w-3" />
                                        ) : (
                                          <Clock className="h-3 w-3" />
                                        )}
                                        {format(deadlineDate!, "dd/MM", { locale: ptBR })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <MissionSheet open={sheetOpen} onOpenChange={handleCloseSheet} mission={selectedMission} />
    </DragDropContext>
  );
}
