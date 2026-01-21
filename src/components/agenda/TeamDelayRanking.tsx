import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateMemberDelayStats, MemberDelayStats } from "@/hooks/useMissionDelayIndicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal } from "lucide-react";
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

export function TeamDelayRanking() {
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

  if (stats.length === 0) {
    return null; // Não mostra o ranking se não há atrasos
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Ranking de Atrasos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {stats.map((stat, index) => (
            <RankingItem key={stat.memberId} stat={stat} position={index + 1} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface RankingItemProps {
  stat: MemberDelayStats;
  position: number;
}

function RankingItem({ stat, position }: RankingItemProps) {
  const positionColors: Record<number, string> = {
    1: "text-red-600 bg-red-50",
    2: "text-orange-600 bg-orange-50",
    3: "text-amber-600 bg-amber-50",
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Position Badge */}
      <Badge
        variant="secondary"
        className={cn(
          "w-6 h-6 p-0 flex items-center justify-center text-xs font-bold",
          positionColors[position] || "bg-muted text-muted-foreground"
        )}
      >
        {position}
      </Badge>

      {/* Avatar */}
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
          {getInitials(stat.memberName)}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <span className="flex-1 font-medium text-sm truncate">
        {stat.memberName}
      </span>

      {/* Emoji Badges */}
      <div className="flex items-center gap-1.5">
        {stat.critical > 0 && (
          <span className="inline-flex items-center gap-0.5 text-sm" title="15+ dias de atraso">
            <span className="text-base">😵‍💫</span>
            <span className="text-xs font-medium text-purple-600">{stat.critical}</span>
          </span>
        )}
        {stat.danger > 0 && (
          <span className="inline-flex items-center gap-0.5 text-sm" title="7-14 dias de atraso">
            <span className="text-base">😔</span>
            <span className="text-xs font-medium text-red-600">{stat.danger}</span>
          </span>
        )}
        {stat.warning > 0 && (
          <span className="inline-flex items-center gap-0.5 text-sm" title="3-6 dias de atraso">
            <span className="text-base">😐</span>
            <span className="text-xs font-medium text-amber-600">{stat.warning}</span>
          </span>
        )}
      </div>
    </div>
  );
}
