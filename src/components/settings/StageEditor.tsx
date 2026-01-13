import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Tables } from "@/integrations/supabase/types";

type Pipeline = Tables<"pipelines">;
type Stage = Tables<"pipeline_stages">;

interface StageEditorProps {
  pipeline: Pipeline;
  onBack: () => void;
}

export function StageEditor({ pipeline, onBack }: StageEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null);
  const [stageName, setStageName] = useState("");
  const [stageOrder, setStageOrder] = useState("");

  // Fetch stages for this pipeline
  const { data: stages, isLoading } = useQuery({
    queryKey: ["pipeline-stages", pipeline.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipeline.id)
        .order("order_index");
      if (error) throw error;
      return data as Stage[];
    },
  });

  // Create stage mutation
  const createStage = useMutation({
    mutationFn: async ({ name, orderIndex }: { name: string; orderIndex: number }) => {
      const { error } = await supabase.from("pipeline_stages").insert({
        name,
        order_index: orderIndex,
        pipeline_id: pipeline.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages", pipeline.id] });
      toast({ title: "Estágio criado!" });
      setNewDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível criar o estágio.", variant: "destructive" });
    },
  });

  // Update stage mutation
  const updateStage = useMutation({
    mutationFn: async ({
      id,
      name,
      orderIndex,
    }: {
      id: string;
      name: string;
      orderIndex: number;
    }) => {
      const { error } = await supabase
        .from("pipeline_stages")
        .update({ name, order_index: orderIndex })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages", pipeline.id] });
      toast({ title: "Estágio atualizado!" });
      setEditingStage(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    },
  });

  // Delete stage mutation
  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages", pipeline.id] });
      toast({ title: "Estágio excluído!" });
      setDeletingStageId(null);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    },
  });

  // Move stage up
  const moveStageUp = useMutation({
    mutationFn: async (stage: Stage) => {
      if (!stages) return;
      const currentIndex = stages.findIndex((s) => s.id === stage.id);
      if (currentIndex <= 0) return;

      const prevStage = stages[currentIndex - 1];

      // Swap order_index values
      await supabase
        .from("pipeline_stages")
        .update({ order_index: prevStage.order_index })
        .eq("id", stage.id);

      await supabase
        .from("pipeline_stages")
        .update({ order_index: stage.order_index })
        .eq("id", prevStage.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages", pipeline.id] });
    },
  });

  // Move stage down
  const moveStageDown = useMutation({
    mutationFn: async (stage: Stage) => {
      if (!stages) return;
      const currentIndex = stages.findIndex((s) => s.id === stage.id);
      if (currentIndex >= stages.length - 1) return;

      const nextStage = stages[currentIndex + 1];

      // Swap order_index values
      await supabase
        .from("pipeline_stages")
        .update({ order_index: nextStage.order_index })
        .eq("id", stage.id);

      await supabase
        .from("pipeline_stages")
        .update({ order_index: stage.order_index })
        .eq("id", nextStage.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages", pipeline.id] });
    },
  });

  const resetForm = () => {
    setStageName("");
    setStageOrder("");
  };

  const handleOpenNew = () => {
    resetForm();
    // Auto-suggest next order index
    const nextOrder = stages?.length ? Math.max(...stages.map((s) => s.order_index)) + 1 : 1;
    setStageOrder(nextOrder.toString());
    setNewDialogOpen(true);
  };

  const handleOpenEdit = (stage: Stage) => {
    setStageName(stage.name);
    setStageOrder(stage.order_index.toString());
    setEditingStage(stage);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <CardTitle className="text-primary flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Estágios de "{pipeline.name}"
              </CardTitle>
              <CardDescription>Configure as etapas do seu funil</CardDescription>
            </div>
            <Button
              onClick={handleOpenNew}
              className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              <Plus className="h-4 w-4" />
              Novo Estágio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : !stages?.length ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum estágio criado. Adicione etapas como "Novo", "Qualificação", "Proposta", "Ganho".
            </p>
          ) : (
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-white p-4 hover:border-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveStageUp.mutate(stage)}
                        disabled={index === 0 || moveStageUp.isPending}
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                      >
                        <span className="text-xs">▲</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveStageDown.mutate(stage)}
                        disabled={index === stages.length - 1 || moveStageDown.isPending}
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                      >
                        <span className="text-xs">▼</span>
                      </Button>
                    </div>
                    <div>
                      <span className="font-medium text-primary">{stage.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Ordem: {stage.order_index})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(stage)}
                      className="h-8 w-8 hover:text-secondary"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingStageId(stage.id)}
                      className="h-8 w-8 hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> Crie um estágio chamado "Ganho" ou "Won" para ativar
              automaticamente o fluxo de fechamento de vendas no Kanban.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Novo Estágio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-primary font-medium">Nome do Estágio</Label>
              <Input
                placeholder="ex: Qualificação, Proposta, Negociação..."
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-primary font-medium">Ordem</Label>
              <Input
                type="number"
                placeholder="1, 2, 3..."
                value={stageOrder}
                onChange={(e) => setStageOrder(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Estágios são exibidos em ordem crescente no Kanban.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                createStage.mutate({
                  name: stageName,
                  orderIndex: parseInt(stageOrder) || 1,
                })
              }
              disabled={!stageName.trim() || createStage.isPending}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              {createStage.isPending ? "Criando..." : "Criar Estágio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingStage}
        onOpenChange={(open) => !open && setEditingStage(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Editar Estágio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-primary font-medium">Nome do Estágio</Label>
              <Input
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-primary font-medium">Ordem</Label>
              <Input
                type="number"
                value={stageOrder}
                onChange={(e) => setStageOrder(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStage(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editingStage &&
                updateStage.mutate({
                  id: editingStage.id,
                  name: stageName,
                  orderIndex: parseInt(stageOrder) || editingStage.order_index,
                })
              }
              disabled={!stageName.trim() || updateStage.isPending}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              {updateStage.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={!!deletingStageId}
        onOpenChange={(open) => !open && setDeletingStageId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary">Excluir Estágio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá o estágio. Deals neste estágio perderão a referência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingStageId && deleteStage.mutate(deletingStageId)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteStage.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
