import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateMemberDelayStats, MemberDelayStats } from "@/hooks/useMissionDelayIndicator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"team_missions">;
type TeamMember = Tables<"team_members">;

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TeamDelayRankingButton() {
  const [open, setOpen] = useState(false);

  const { data: missions = [] } = useQuery({
    queryKey: ["team_missions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_missions")
        .select("*")
        .neq("status", "Concluído");
      if (error) throw error;
      return data as Mission[];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["team_members", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as TeamMember[];
    },
  });

  const stats = calculateMemberDelayStats(
    missions,
    members.map((m) => ({ id: m.id, name: m.name }))
  );

  const totalDelays = stats.reduce((acc, s) => acc + s.critical + s.danger + s.warning, 0);

  // Se não há atrasos, não mostra o botão
  if (stats.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 bg-background"
        >
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="hidden sm:inline">Ranking</span>
          {totalDelays > 0 && (
            <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700 border-red-200">
              {totalDelays}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Ranking de Atrasos
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4 p-3 bg-muted/50 rounded-lg text-sm">
            <span className="flex items-center gap-1">
              <span>😐</span>
              <span className="text-muted-foreground">3+ dias</span>
            </span>
            <span className="flex items-center gap-1">
              <span>😔</span>
              <span className="text-muted-foreground">7+ dias</span>
            </span>
            <span className="flex items-center gap-1">
              <span>😵‍💫</span>
              <span className="text-muted-foreground">15+ dias</span>
            </span>
          </div>

          {/* Ranking List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {stats.map((stat, index) => (
              <RankingItem key={stat.memberId} stat={stat} position={index + 1} />
            ))}
          </div>

          {stats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>🎉 Nenhum atraso registrado!</p>
              <p className="text-sm mt-1">A equipe está em dia com as tarefas.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RankingItemProps {
  stat: MemberDelayStats;
  position: number;
}

function RankingItem({ stat, position }: RankingItemProps) {
  const positionColors: Record<number, string> = {
    1: "text-red-600 bg-red-50 border-red-200",
    2: "text-orange-600 bg-orange-50 border-orange-200",
    3: "text-amber-600 bg-amber-50 border-amber-200",
  };

  // Calculate bar width based on total score (max 100%)
  const maxScore = 20; // Reasonable max for visualization
  const barWidth = Math.min((stat.totalScore / maxScore) * 100, 100);

  return (
    <div className="relative overflow-hidden rounded-lg border p-3">
      {/* Background bar */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 opacity-20",
          position === 1 && "bg-red-500",
          position === 2 && "bg-orange-500",
          position === 3 && "bg-amber-500",
          position > 3 && "bg-gray-400"
        )}
        style={{ width: `${barWidth}%` }}
      />
      
      <div className="relative flex items-center gap-3">
        {/* Position Badge */}
        <Badge
          variant="outline"
          className={cn(
            "w-7 h-7 p-0 flex items-center justify-center text-xs font-bold",
            positionColors[position] || "bg-muted text-muted-foreground border-muted"
          )}
        >
          {position}
        </Badge>

        {/* Avatar */}
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {getInitials(stat.memberName)}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <span className="flex-1 font-medium text-sm truncate">
          {stat.memberName}
        </span>

        {/* Emoji Counts */}
        <div className="flex items-center gap-2">
          {stat.critical > 0 && (
            <span className="inline-flex items-center gap-0.5" title="15+ dias de atraso">
              <span className="text-lg">😵‍💫</span>
              <span className="text-xs font-bold text-purple-600">{stat.critical}</span>
            </span>
          )}
          {stat.danger > 0 && (
            <span className="inline-flex items-center gap-0.5" title="7-14 dias de atraso">
              <span className="text-lg">😔</span>
              <span className="text-xs font-bold text-red-600">{stat.danger}</span>
            </span>
          )}
          {stat.warning > 0 && (
            <span className="inline-flex items-center gap-0.5" title="3-6 dias de atraso">
              <span className="text-lg">😐</span>
              <span className="text-xs font-bold text-amber-600">{stat.warning}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
