import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MissionSheet } from "./MissionSheet";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"team_missions">;
type TeamMember = Tables<"team_members">;

const statusColors: Record<string, string> = {
  Pendente: "bg-yellow-500",
  "Em Andamento": "bg-blue-500",
  "Em Revisão": "bg-purple-500",
  Concluído: "bg-green-500",
  "Stand-by": "bg-gray-500",
};

const statusLabels: Record<string, string> = {
  Pendente: "Pendente",
  "Em Andamento": "Em Andamento",
  "Em Revisão": "Em Revisão",
  Concluído: "Concluído",
  "Stand-by": "Stand-by",
};

export function AgendaCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getMissionsForDay = (date: Date) => {
    return missions.filter((m) => m.deadline && isSameDay(parseISO(m.deadline), date));
  };

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

  const handleMissionClick = (mission: Mission) => {
    setSelectedMission(mission);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setSelectedMission(null);
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const firstDayOfMonth = monthStart.getDay();

  const MAX_VISIBLE_MISSIONS = 2;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before the first day of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="h-28 bg-muted/20 rounded-lg" />
          ))}

          {/* Days of the month */}
          {days.map((day) => {
            const dayMissions = getMissionsForDay(day);
            const today = isToday(day);
            const hasMoreMissions = dayMissions.length > MAX_VISIBLE_MISSIONS;
            const hiddenCount = dayMissions.length - MAX_VISIBLE_MISSIONS;

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "h-28 p-2 rounded-lg border transition-all overflow-hidden",
                  today 
                    ? "bg-accent/20 border-accent ring-1 ring-accent/30" 
                    : "bg-background hover:bg-muted/30 border-border/50"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                      today ? "bg-accent text-accent-foreground" : "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayMissions.length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {dayMissions.length} {dayMissions.length === 1 ? "tarefa" : "tarefas"}
                    </span>
                  )}
                </div>

                <div className="space-y-0.5 overflow-hidden">
                  {dayMissions.slice(0, MAX_VISIBLE_MISSIONS).map((mission) => {
                    const isOverdue = mission.deadline && isBefore(parseISO(mission.deadline), new Date()) && mission.status !== "Concluído";
                    const owner = getMemberById(mission.owner_id);
                    const supportMembers = getSupportMembers((mission as any).support_ids);

                    return (
                      <HoverCard key={mission.id} openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <button
                            onClick={() => handleMissionClick(mission)}
                            className={cn(
                              "w-full flex items-center gap-1 text-[11px] py-0.5 px-1.5 rounded-md transition-colors text-left group",
                              isOverdue 
                                ? "bg-destructive/10 hover:bg-destructive/20 text-destructive" 
                                : "hover:bg-muted/80"
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                statusColors[mission.status || "Pendente"]
                              )}
                            />
                            <span className="truncate font-medium">{mission.mission}</span>
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent 
                          className="w-80 p-0 shadow-lg" 
                          side="right" 
                          align="start"
                          sideOffset={8}
                        >
                          <MissionTooltipContent 
                            mission={mission} 
                            owner={owner} 
                            supportMembers={supportMembers}
                            getInitials={getInitials}
                            isOverdue={isOverdue}
                          />
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}

                  {hasMoreMissions && (
                    <HoverCard openDelay={200} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <button 
                          className="w-full text-[10px] text-accent font-semibold py-0.5 px-1.5 rounded hover:bg-accent/10 transition-colors text-left"
                        >
                          +{hiddenCount} mais
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent 
                        className="w-80 p-0 shadow-lg max-h-80 flex flex-col" 
                        side="right" 
                        align="start"
                        sideOffset={8}
                      >
                        <div className="p-3 border-b bg-muted/30 flex-shrink-0">
                          <p className="font-semibold text-sm">
                            {format(day, "d 'de' MMMM", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {dayMissions.length} {dayMissions.length === 1 ? "tarefa" : "tarefas"} agendadas
                          </p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
                          {dayMissions.map((mission) => {
                            const isOverdue = mission.deadline && isBefore(parseISO(mission.deadline), new Date()) && mission.status !== "Concluído";
                            const owner = getMemberById(mission.owner_id);
                            const supportMembers = getSupportMembers((mission as any).support_ids);

                            return (
                              <button
                                key={mission.id}
                                onClick={() => handleMissionClick(mission)}
                                className={cn(
                                  "w-full p-2 rounded-lg text-left transition-colors",
                                  isOverdue 
                                    ? "bg-destructive/5 hover:bg-destructive/10" 
                                    : "hover:bg-muted/50"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <span
                                    className={cn(
                                      "w-2 h-2 rounded-full flex-shrink-0 mt-1.5",
                                      statusColors[mission.status || "Pendente"]
                                    )}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-xs font-medium line-clamp-2",
                                      isOverdue && "text-destructive"
                                    )}>
                                      {mission.mission}
                                    </p>
                                    {owner && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground truncate">
                                          {owner.name}
                                          {supportMembers.length > 0 && ` +${supportMembers.length}`}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t">
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={cn("w-2.5 h-2.5 rounded-full", color)} />
              <span className="text-xs text-muted-foreground">{status}</span>
            </div>
          ))}
        </div>
      </CardContent>

      <MissionSheet open={sheetOpen} onOpenChange={handleCloseSheet} mission={selectedMission} />
    </Card>
  );
}

// Separate component for tooltip content
function MissionTooltipContent({ 
  mission, 
  owner, 
  supportMembers, 
  getInitials,
  isOverdue 
}: { 
  mission: Mission; 
  owner: TeamMember | null; 
  supportMembers: TeamMember[];
  getInitials: (name: string | null) => string;
  isOverdue: boolean;
}) {
  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className={cn(
        "p-3 border-b",
        isOverdue ? "bg-destructive/10" : "bg-muted/30"
      )}>
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1",
              statusColors[mission.status || "Pendente"]
            )}
          />
          <div className="flex-1 min-w-0">
            <p className={cn(
              "font-semibold text-sm leading-tight",
              isOverdue && "text-destructive"
            )}>
              {mission.mission}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {statusLabels[mission.status || "Pendente"]}
              </Badge>
              {mission.department && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {mission.department}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Owner */}
        {owner && (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {getInitials(owner.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{owner.name}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                Responsável
              </p>
            </div>
          </div>
        )}

        {/* Support members */}
        {supportMembers.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Apoio ({supportMembers.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {supportMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2 py-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-[9px] font-medium">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] text-muted-foreground">{member.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Target goal */}
        {mission.target_goal && (
          <div className="pt-2 border-t">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Meta
            </p>
            <p className="text-xs text-foreground">{mission.target_goal}</p>
          </div>
        )}
      </div>
    </div>
  );
}
