import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, addWeeks, addMonths, setDate, addYears } from "date-fns";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"team_missions">;

type RecurrenceType = "daily" | "weekly" | "monthly" | "specific_day";

interface CreateNextRecurrenceParams {
  mission: Mission;
}

/**
 * Calcula a próxima data com base no tipo de recorrência
 */
function calculateNextDeadline(
  currentDeadline: Date,
  recurrenceType: RecurrenceType,
  recurrenceDay?: number | null
): Date {
  switch (recurrenceType) {
    case "daily":
      return addDays(currentDeadline, 1);
    case "weekly":
      return addWeeks(currentDeadline, 1);
    case "monthly":
      return addMonths(currentDeadline, 1);
    case "specific_day":
      if (recurrenceDay) {
        // Próximo mês no dia específico
        let nextDate = addMonths(currentDeadline, 1);
        nextDate = setDate(nextDate, Math.min(recurrenceDay, 28)); // Limita a 28 para evitar problemas com meses curtos
        return nextDate;
      }
      return addMonths(currentDeadline, 1);
    default:
      return addMonths(currentDeadline, 1);
  }
}

/**
 * Hook para gerenciar criação automática de tarefas recorrentes
 */
export function useRecurringMissions() {
  const queryClient = useQueryClient();

  const createNextRecurrence = useMutation({
    mutationFn: async ({ mission }: CreateNextRecurrenceParams) => {
      const missionData = mission as any;
      
      if (!missionData.is_recurring || !missionData.recurrence_type) {
        throw new Error("Missão não é recorrente");
      }

      if (!mission.deadline) {
        throw new Error("Missão recorrente precisa ter deadline");
      }

      const currentDeadline = new Date(mission.deadline);
      const nextDeadline = calculateNextDeadline(
        currentDeadline,
        missionData.recurrence_type as RecurrenceType,
        missionData.recurrence_day
      );

      // Criar nova missão com os mesmos dados, exceto status e deadline
      const newMission = {
        mission: mission.mission,
        department: mission.department,
        target_goal: mission.target_goal,
        owner_id: mission.owner_id,
        support_ids: missionData.support_ids || [],
        deadline: nextDeadline.toISOString().split("T")[0], // Apenas data
        status: "Pendente" as const,
        notes: mission.notes,
        is_recurring: true,
        recurrence_type: missionData.recurrence_type,
        recurrence_day: missionData.recurrence_day,
        parent_mission_id: mission.id,
        order_index: 0,
      };

      const { data, error } = await supabase
        .from("team_missions")
        .insert(newMission as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_missions"] });
      toast.success("Próxima ocorrência criada automaticamente!");
    },
    onError: (error) => {
      console.error("Erro ao criar recorrência:", error);
      toast.error("Erro ao criar próxima ocorrência");
    },
  });

  return {
    createNextRecurrence,
  };
}
