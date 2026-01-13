import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MissionSheet } from "./MissionSheet";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"team_missions">;

const statusColors: Record<string, string> = {
  Pendente: "bg-yellow-500",
  "Em Andamento": "bg-blue-500",
  "Em Revisão": "bg-purple-500",
  Concluído: "bg-green-500",
  "Stand-by": "bg-gray-500",
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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getMissionsForDay = (date: Date) => {
    return missions.filter((m) => m.deadline && isSameDay(new Date(m.deadline), date));
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

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <div className="flex gap-2">
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
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before the first day of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="h-24 bg-muted/30 rounded-lg" />
          ))}

          {/* Days of the month */}
          {days.map((day) => {
            const dayMissions = getMissionsForDay(day);
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "h-24 p-2 rounded-lg border transition-colors",
                  today ? "bg-secondary/10 border-secondary" : "bg-background hover:bg-muted/50"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    today ? "text-secondary" : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-1 overflow-hidden">
                  {dayMissions.slice(0, 3).map((mission) => {
                    const isOverdue = mission.deadline && isBefore(new Date(mission.deadline), new Date()) && mission.status !== "Concluído";
                    return (
                      <button
                        key={mission.id}
                        onClick={() => handleMissionClick(mission)}
                        className={cn(
                          "w-full flex items-center gap-1.5 text-xs p-1 rounded hover:bg-muted transition-colors text-left",
                          isOverdue && "text-destructive"
                        )}
                      >
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            statusColors[mission.status || "Pendente"]
                          )}
                        />
                        <span className="truncate">{mission.mission}</span>
                      </button>
                    );
                  })}
                  {dayMissions.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{dayMissions.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <span className={cn("w-3 h-3 rounded-full", color)} />
              <span className="text-sm text-muted-foreground">{status}</span>
            </div>
          ))}
        </div>
      </CardContent>

      <MissionSheet open={sheetOpen} onOpenChange={handleCloseSheet} mission={selectedMission} />
    </Card>
  );
}
