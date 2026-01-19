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

interface AgendaKanbanProps {
  ownerFilter: string | null;
  departmentFilter?: string | null;
  searchTerm?: string;
}

export function AgendaKanban({ ownerFilter, departmentFilter, searchTerm = "" }: AgendaKanbanProps) {
  const queryClient = useQueryClient();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: missions = [] } = useQuery({
    queryKey: ["team_missions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_missions")
        .select("*")
        .order("order_index", { ascending: true });
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

  // Mutation for updating status only (moving between columns)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, order_index }: { id: string; status: MissionStatus; order_index: number }) => {
      const { error } = await supabase.from("team_missions").update({ status, order_index }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status, order_index }) => {
      await queryClient.cancelQueries({ queryKey: ["team_missions"] });
      const previousMissions = queryClient.getQueryData<Mission[]>(["team_missions"]);

      queryClient.setQueryData<Mission[]>(["team_missions"], (old) =>
        old?.map((mission) => (mission.id === id ? { ...mission, status, order_index } : mission)),
      );

      return { previousMissions };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousMissions) {
        queryClient.setQueryData(["team_missions"], context.previousMissions);
      }
      toast.error("Erro ao mover missão");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["team_missions"] });
    },
  });

  // Mutation for batch reordering within the same column
  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; order_index: number }[]) => {
      // Update each mission's order_index
      const promises = updates.map(({ id, order_index }) =>
        supabase.from("team_missions").update({ order_index }).eq("id", id),
      );
      const results = await Promise.all(promises);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["team_missions"] });
      const previousMissions = queryClient.getQueryData<Mission[]>(["team_missions"]);

      queryClient.setQueryData<Mission[]>(["team_missions"], (old) => {
        if (!old) return old;
        const updateMap = new Map(updates.map((u) => [u.id, u.order_index]));
        return old.map((mission) => {
          const newIndex = updateMap.get(mission.id);
          return newIndex !== undefined ? { ...mission, order_index: newIndex } : mission;
        });
      });

      return { previousMissions };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousMissions) {
        queryClient.setQueryData(["team_missions"], context.previousMissions);
      }
      toast.error("Erro ao reordenar");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["team_missions"] });
    },
  });

  const getMemberById = (memberId: string | null) => {
    if (!memberId) return null;
    return members.find((m) => m.id === memberId) || null;
  };

  const getSupportMembers = (supportIds: string[] | null) => {
    if (!supportIds || supportIds.length === 0) return [];
    return supportIds.map((id) => members.find((m) => m.id === id)).filter((m): m is TeamMember => m !== undefined);
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

  // Filter missions by owner, department and search term
  const filteredMissions = missions.filter((m) => {
    const matchesOwner = ownerFilter ? m.owner_id === ownerFilter : true;
    const matchesDepartment = departmentFilter ? m.department === departmentFilter : true;
    const matchesSearch = searchTerm ? m.mission?.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchesOwner && matchesDepartment && matchesSearch;
  });

  const getMissionsByStatus = (status: MissionStatus) => {
    return filteredMissions
      .filter((m) => m.status === status)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const sourceStatus = source.droppableId as MissionStatus;
    const destStatus = destination.droppableId as MissionStatus;

    // Get current missions for source and destination columns
    const sourceMissions = getMissionsByStatus(sourceStatus);
    const destMissions = sourceStatus === destStatus ? sourceMissions : getMissionsByStatus(destStatus);

    // Find the dragged mission
    const draggedMission = missions.find((m) => m.id === draggableId);
    if (!draggedMission) return;

    if (sourceStatus === destStatus) {
      // Reordering within the same column
      const reordered = [...sourceMissions];
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);

      // Create updates with new order indices
      const updates = reordered.map((mission, index) => ({
        id: mission.id,
        order_index: index,
      }));

      reorderMutation.mutate(updates);
    } else {
      // Moving to a different column
      // Calculate new order_index for destination
      let newOrderIndex: number;
      if (destMissions.length === 0) {
        newOrderIndex = 0;
      } else if (destination.index === 0) {
        newOrderIndex = (destMissions[0]?.order_index ?? 0) - 1;
      } else if (destination.index >= destMissions.length) {
        newOrderIndex = (destMissions[destMissions.length - 1]?.order_index ?? 0) + 1;
      } else {
        const prevIndex = destMissions[destination.index - 1]?.order_index ?? 0;
        const nextIndex = destMissions[destination.index]?.order_index ?? prevIndex + 2;
        newOrderIndex = Math.floor((prevIndex + nextIndex) / 2);
      }

      updateStatusMutation.mutate({
        id: draggableId,
        status: destStatus,
        order_index: newOrderIndex,
      });
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
                          "h-[500px] overflow-y-auto space-y-3 transition-colors rounded-lg p-1",
                          snapshot.isDraggingOver && "bg-secondary/10",
                        )}
                      >
                        {columnMissions.map((mission, index) => {
                          const owner = getMemberById(mission.owner_id);
                          const supportMembers = getSupportMembers((mission as any).support_ids);
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
                                    snapshot.isDragging && "shadow-lg rotate-2",
                                  )}
                                >
                                  <h4 className="font-medium text-sm mb-2 line-clamp-2">{mission.mission}</h4>

                                  {mission.department && (
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        "text-xs mb-2",
                                        departmentColors[mission.department] || "bg-gray-100 text-gray-800",
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
                                          title={`Apoio: ${supportMembers.map((s) => s.name).join(", ")}`}
                                        >
                                          {supportMembers.map((s) => getInitials(s.name)).join(" ")}
                                        </span>
                                      )}
                                    </div>

                                    {mission.deadline && (
                                      <div
                                        className={cn(
                                          "flex items-center gap-1 text-xs",
                                          isOverdue ? "text-destructive" : "text-muted-foreground",
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
