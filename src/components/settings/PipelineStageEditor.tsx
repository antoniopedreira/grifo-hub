import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageEditor, Stage } from "./StageEditor";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface Pipeline {
  id: string;
  name: string;
  archived?: boolean;
}

interface PipelineStageEditorProps {
  pipeline: Pipeline;
  onBack: () => void;
}

export function PipelineStageEditor({ pipeline, onBack }: PipelineStageEditorProps) {
  const queryClient = useQueryClient();
  const [stages, setStages] = useState<Stage[]>([]);

  const { data: fetchedStages, isLoading } = useQuery({
    queryKey: ["pipeline-stages", pipeline.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipeline.id)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (fetchedStages) {
      setStages(
        fetchedStages.map((s) => ({
          id: s.id,
          name: s.name,
          order_index: s.order_index,
          type: (s.type as Stage["type"]) || "default",
        }))
      );
    }
  }, [fetchedStages]);

  const saveMutation = useMutation({
    mutationFn: async (stagesToSave: Stage[]) => {
      // Get current stage IDs
      const currentStageIds = stagesToSave.filter(s => s.id).map(s => s.id);
      
      // Delete stages that are no longer in the list (only those without deals)
      if (fetchedStages && fetchedStages.length > 0) {
        const stagesToDelete = fetchedStages
          .filter(s => !currentStageIds.includes(s.id))
          .map(s => s.id);
        
        if (stagesToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from("pipeline_stages")
            .delete()
            .in("id", stagesToDelete);
          
          // Ignore FK constraint errors - stage has deals attached
          if (deleteError && deleteError.code !== "23503") {
            throw deleteError;
          }
        }
      }

      // Upsert stages (update existing, insert new)
      for (let i = 0; i < stagesToSave.length; i++) {
        const stage = stagesToSave[i];
        
        if (stage.id) {
          // Update existing stage
          const { error } = await supabase
            .from("pipeline_stages")
            .update({
              name: stage.name,
              order_index: i,
              type: stage.type || "default",
            })
            .eq("id", stage.id);
          if (error) throw error;
        } else {
          // Insert new stage
          const { error } = await supabase
            .from("pipeline_stages")
            .insert({
              pipeline_id: pipeline.id,
              name: stage.name,
              order_index: i,
              type: stage.type || "default",
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      toast.success("Etapas salvas com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar etapas");
    },
  });

  const handleSave = () => {
    saveMutation.mutate(stages);
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Etapas do Pipeline: {pipeline.name}</CardTitle>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </CardHeader>
      <CardContent>
        <StageEditor stages={stages} onChange={setStages} />
      </CardContent>
    </Card>
  );
}
