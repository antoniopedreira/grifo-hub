import { differenceInDays, parseISO, startOfDay } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"team_missions">;

export type DelayLevel = "none" | "warning" | "danger" | "critical";

export interface DelayIndicator {
  level: DelayLevel;
  emoji: string;
  daysLate: number;
  label: string;
}

/**
 * Calcula o indicador de atraso baseado na data marco (milestone_date).
 * - 3+ dias de atraso: 😐 (warning - amarelo)
 * - 7+ dias de atraso: 😔 (danger - vermelho)
 * - 15+ dias de atraso: 😵‍💫 (critical - roxo)
 */
export function getDelayIndicator(mission: Mission): DelayIndicator {
  const missionData = mission as any;
  const milestoneDate = missionData.milestone_date;
  
  // Se não há data marco ou missão já está concluída, não há atraso
  if (!milestoneDate || mission.status === "Concluído") {
    return { level: "none", emoji: "", daysLate: 0, label: "" };
  }

  const today = startOfDay(new Date());
  const milestone = startOfDay(parseISO(milestoneDate));
  const daysLate = differenceInDays(today, milestone);

  // Se não está atrasado em relação à data marco
  if (daysLate < 3) {
    return { level: "none", emoji: "", daysLate: 0, label: "" };
  }

  if (daysLate >= 15) {
    return { 
      level: "critical", 
      emoji: "😵‍💫", 
      daysLate, 
      label: `${daysLate} dias de atraso` 
    };
  }

  if (daysLate >= 7) {
    return { 
      level: "danger", 
      emoji: "😔", 
      daysLate, 
      label: `${daysLate} dias de atraso` 
    };
  }

  // 3-6 dias
  return { 
    level: "warning", 
    emoji: "😐", 
    daysLate, 
    label: `${daysLate} dias de atraso` 
  };
}

/**
 * Calcula estatísticas de atraso para um membro da equipe
 */
export interface MemberDelayStats {
  memberId: string;
  memberName: string;
  critical: number; // 😵‍💫
  danger: number;   // 😔
  warning: number;  // 😐
  totalScore: number; // Para ordenação (critical*3 + danger*2 + warning*1)
}

export function calculateMemberDelayStats(
  missions: Mission[],
  members: { id: string; name: string }[]
): MemberDelayStats[] {
  const statsMap = new Map<string, MemberDelayStats>();

  // Inicializa stats para cada membro
  members.forEach((member) => {
    statsMap.set(member.id, {
      memberId: member.id,
      memberName: member.name,
      critical: 0,
      danger: 0,
      warning: 0,
      totalScore: 0,
    });
  });

  // Conta atrasos por membro
  missions.forEach((mission) => {
    if (!mission.owner_id) return;
    
    const indicator = getDelayIndicator(mission);
    const stats = statsMap.get(mission.owner_id);
    
    if (stats && indicator.level !== "none") {
      switch (indicator.level) {
        case "critical":
          stats.critical++;
          stats.totalScore += 3;
          break;
        case "danger":
          stats.danger++;
          stats.totalScore += 2;
          break;
        case "warning":
          stats.warning++;
          stats.totalScore += 1;
          break;
      }
    }
  });

  // Converte para array e ordena por totalScore (maior primeiro)
  return Array.from(statsMap.values())
    .filter(s => s.totalScore > 0 || s.critical > 0 || s.danger > 0 || s.warning > 0)
    .sort((a, b) => b.totalScore - a.totalScore);
}
