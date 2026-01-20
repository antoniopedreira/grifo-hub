import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings2, Trash2, Pencil, GitBranch, Archive, ArchiveRestore, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Pipeline {
  id: string;
  name: string;
  archived?: boolean;
}

interface PipelineListProps {
  onSelectPipeline: (pipeline: Pipeline) => void;
}

export function PipelineList({ onSelectPipeline }: PipelineListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [deletingPipelineId, setDeletingPipelineId] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Fetch pipelines
  const { data: pipelines, isLoading } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Pipeline[];
    },
  });

  // Create pipeline mutation
  const createPipeline = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("pipelines")
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast({ title: "Pipeline criado!", description: "O novo funil foi adicionado." });
      setNewDialogOpen(false);
      setPipelineName("");
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível criar o pipeline.", variant: "destructive" });
    },
  });

  // Update pipeline mutation
  const updatePipeline = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("pipelines").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast({ title: "Pipeline atualizado!" });
      setEditingPipeline(null);
      setPipelineName("");
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    },
  });

  // Archive/Unarchive pipeline mutation
  const toggleArchivePipeline = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      // If archiving, first unlink products from this pipeline
      if (archived) {
        const { error: unlinkError } = await supabase
          .from("products")
          .update({ pipeline_id: null })
          .eq("pipeline_id", id);
        if (unlinkError) throw unlinkError;
      }

      const { error } = await supabase
        .from("pipelines")
        .update({ archived })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ 
        title: variables.archived ? "Pipeline arquivado!" : "Pipeline restaurado!",
        description: variables.archived 
          ? "O pipeline não aparecerá mais no seletor. Produtos desvinculados."
          : "O pipeline está disponível novamente."
      });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    },
  });

  // Duplicate pipeline mutation
  const duplicatePipeline = useMutation({
    mutationFn: async (pipeline: Pipeline) => {
      // 1. Create new pipeline with "(Cópia)" suffix
      const { data: newPipeline, error: pipelineError } = await supabase
        .from("pipelines")
        .insert({ name: `${pipeline.name} (Cópia)`, archived: false })
        .select()
        .single();
      
      if (pipelineError) throw pipelineError;

      // 2. Fetch all stages from the original pipeline
      const { data: originalStages, error: stagesError } = await supabase
        .from("pipeline_stages")
        .select("name, order_index, type")
        .eq("pipeline_id", pipeline.id)
        .order("order_index", { ascending: true });
      
      if (stagesError) throw stagesError;

      // 3. Create copies of stages for the new pipeline
      if (originalStages && originalStages.length > 0) {
        const newStages = originalStages.map((stage) => ({
          name: stage.name,
          order_index: stage.order_index,
          type: stage.type,
          pipeline_id: newPipeline.id,
        }));

        const { error: insertStagesError } = await supabase
          .from("pipeline_stages")
          .insert(newStages);
        
        if (insertStagesError) throw insertStagesError;
      }

      return newPipeline;
    },
    onSuccess: (newPipeline) => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
      toast({ 
        title: "Pipeline duplicado!", 
        description: `"${newPipeline.name}" foi criado com todos os estágios.` 
      });
    },
    onError: (error: Error) => {
      console.error("Duplicate error:", error);
      toast({ title: "Erro", description: error.message || "Não foi possível duplicar o pipeline.", variant: "destructive" });
    },
  });

  // Delete pipeline mutation
  const deletePipeline = useMutation({
    mutationFn: async (id: string) => {
      // 1. Check if there are deals linked to any stage of this pipeline
      const { data: pipelineStages } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("pipeline_id", id);
      
      if (pipelineStages && pipelineStages.length > 0) {
        const stageIds = pipelineStages.map(s => s.id);
        const { data: linkedDeals } = await supabase
          .from("deals")
          .select("id")
          .in("stage_id", stageIds)
          .limit(1);
        
        if (linkedDeals && linkedDeals.length > 0) {
          throw new Error("Este pipeline possui deals vinculados. Arquive-o ou mova os deals antes de excluir.");
        }
      }

      // 2. Unlink products that reference this pipeline
      const { error: unlinkProductsError } = await supabase
        .from("products")
        .update({ pipeline_id: null })
        .eq("pipeline_id", id);
      if (unlinkProductsError) throw unlinkProductsError;

      // 3. Delete all stages of this pipeline
      const { error: stagesError } = await supabase
        .from("pipeline_stages")
        .delete()
        .eq("pipeline_id", id);
      if (stagesError) throw stagesError;

      // 4. Delete the pipeline
      const { error } = await supabase.from("pipelines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Pipeline excluído!" });
      setDeletingPipelineId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message || "Não foi possível excluir.", variant: "destructive" });
    },
  });

  const handleOpenNew = () => {
    setPipelineName("");
    setNewDialogOpen(true);
  };

  const handleOpenEdit = (pipeline: Pipeline) => {
    setPipelineName(pipeline.name);
    setEditingPipeline(pipeline);
  };

  const activePipelines = pipelines?.filter(p => !p.archived) || [];
  const archivedPipelines = pipelines?.filter(p => p.archived) || [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-primary flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Pipelines
            </CardTitle>
            <CardDescription>Gerencie seus funis de vendas</CardDescription>
          </div>
          <Button
            onClick={handleOpenNew}
            className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Plus className="h-4 w-4" />
            Novo Pipeline
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : !pipelines?.length ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum pipeline criado. Crie seu primeiro funil de vendas!
            </p>
          ) : (
            <div className="space-y-4">
              {/* Active Pipelines */}
              <div className="space-y-2">
                {activePipelines.map((pipeline) => (
                  <div
                    key={pipeline.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-white p-4 hover:border-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <GitBranch className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium text-primary">{pipeline.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSelectPipeline(pipeline)}
                        className="h-8 w-8 hover:text-secondary"
                        title="Configurar Estágios"
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(pipeline)}
                        className="h-8 w-8 hover:text-secondary"
                        title="Renomear"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicatePipeline.mutate(pipeline)}
                        disabled={duplicatePipeline.isPending}
                        className="h-8 w-8 hover:text-blue-600"
                        title="Duplicar"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleArchivePipeline.mutate({ id: pipeline.id, archived: true })}
                        className="h-8 w-8 hover:text-amber-600"
                        title="Arquivar"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPipelineId(pipeline.id)}
                        className="h-8 w-8 hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Archived Section */}
              {archivedPipelines.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
                  >
                    <Archive className="h-4 w-4" />
                    <span>Arquivados ({archivedPipelines.length})</span>
                    <span className={cn("transition-transform", showArchived && "rotate-180")}>▼</span>
                  </button>
                  
                  {showArchived && (
                    <div className="space-y-2">
                      {archivedPipelines.map((pipeline) => (
                        <div
                          key={pipeline.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <div className="flex items-center gap-3">
                            <GitBranch className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium text-muted-foreground">{pipeline.name}</span>
                            <Badge variant="secondary" className="text-xs">Arquivado</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleArchivePipeline.mutate({ id: pipeline.id, archived: false })}
                              className="h-8 w-8 hover:text-green-600"
                              title="Restaurar"
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingPipelineId(pipeline.id)}
                              className="h-8 w-8 hover:text-destructive"
                              title="Excluir permanentemente"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Novo Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-primary font-medium">Nome do Pipeline</Label>
              <Input
                placeholder="ex: Parcerias, Vendas B2B..."
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createPipeline.mutate(pipelineName)}
              disabled={!pipelineName.trim() || createPipeline.isPending}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              {createPipeline.isPending ? "Criando..." : "Criar Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPipeline} onOpenChange={(open) => !open && setEditingPipeline(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Renomear Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-primary font-medium">Nome do Pipeline</Label>
              <Input
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPipeline(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editingPipeline &&
                updatePipeline.mutate({ id: editingPipeline.id, name: pipelineName })
              }
              disabled={!pipelineName.trim() || updatePipeline.isPending}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              {updatePipeline.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={!!deletingPipelineId}
        onOpenChange={(open) => !open && setDeletingPipelineId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary">Excluir Pipeline</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá o pipeline e todos os estágios associados permanentemente. Considere arquivar se quiser manter o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPipelineId && deletePipeline.mutate(deletingPipelineId)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deletePipeline.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
