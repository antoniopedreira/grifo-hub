import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isBefore, parseISO, startOfDay } from "date-fns";
import { toast } from "sonner";

/**
 * Hook que verifica tarefas em Stand-by com deadline vencido
 * e as move automaticamente para Pendente
 */
export function useStandbyAutomation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAndUpdateStandbyMissions = async () => {
      try {
        // Buscar todas as missões em Stand-by com deadline
        const { data: standbyMissions, error: fetchError } = await supabase
          .from("team_missions")
          .select("id, deadline")
          .eq("status", "Stand-by")
          .not("deadline", "is", null);

        if (fetchError) {
          console.error("Erro ao buscar missões em Stand-by:", fetchError);
          return;
        }

        if (!standbyMissions || standbyMissions.length === 0) {
          return;
        }

        const today = startOfDay(new Date());
        const overdueIds: string[] = [];

        // Identificar missões com deadline vencido
        standbyMissions.forEach((mission) => {
          if (mission.deadline) {
            const deadlineDate = parseISO(mission.deadline);
            // Se o deadline é anterior a hoje (não inclui hoje)
            if (isBefore(deadlineDate, today)) {
              overdueIds.push(mission.id);
            }
          }
        });

        if (overdueIds.length === 0) {
          return;
        }

        // Atualizar todas as missões vencidas para Pendente
        const { error: updateError } = await supabase
          .from("team_missions")
          .update({ status: "Pendente" })
          .in("id", overdueIds);

        if (updateError) {
          console.error("Erro ao atualizar missões:", updateError);
          return;
        }

        // Invalidar cache para refletir mudanças
        queryClient.invalidateQueries({ queryKey: ["team_missions"] });

        // Notificar usuário
        toast.info(
          `${overdueIds.length} ${overdueIds.length === 1 ? "tarefa" : "tarefas"} em Stand-by ${overdueIds.length === 1 ? "foi movida" : "foram movidas"} para Pendente (prazo vencido)`
        );
      } catch (error) {
        console.error("Erro na automação Stand-by:", error);
      }
    };

    // Executar verificação ao carregar
    checkAndUpdateStandbyMissions();
  }, [queryClient]);
}
