import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { DealTag } from "./types";

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_COLORS = [
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#3b82f6", // blue
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

export function TagManagerDialog({ open, onOpenChange }: TagManagerDialogProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", color: "#6366f1", description: "" });

  // Fetch all tags
  const { data: tags = [] } = useQuery({
    queryKey: ["deal-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as DealTag[];
    },
    enabled: open,
  });

  // Create tag mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; description: string }) => {
      const { error } = await supabase
        .from("deal_tags")
        .insert({ name: data.name, color: data.color, description: data.description || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-tags"] });
      toast.success("Tag criada com sucesso");
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao criar tag");
    },
  });

  // Update tag mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; color: string; description: string } }) => {
      const { error } = await supabase
        .from("deal_tags")
        .update({ name: data.name, color: data.color, description: data.description || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-tags"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Tag atualizada");
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao atualizar tag");
    },
  });

  // Delete tag mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deal_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-tags"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Tag excluída");
    },
    onError: () => {
      toast.error("Erro ao excluir tag");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", color: "#6366f1", description: "" });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleStartEdit = (tag: DealTag) => {
    setFormData({ name: tag.name, color: tag.color, description: tag.description || "" });
    setEditingId(tag.id);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create/Edit Form */}
          {(isCreating || editingId) && (
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <Input
                placeholder="Nome da tag"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                placeholder="Descrição (opcional)"
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Cor:</span>
                <div className="flex gap-1 flex-wrap">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData((f) => ({ ...f, color }))}
                      className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: formData.color === color ? "white" : "transparent",
                        boxShadow: formData.color === color ? `0 0 0 2px ${color}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {editingId ? "Salvar" : "Criar"}
                </Button>
              </div>
            </div>
          )}

          {/* Add Button */}
          {!isCreating && !editingId && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsCreating(true);
                setFormData({ name: "", color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)], description: "" });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Tag
            </Button>
          )}

          {/* Tags List */}
          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <span
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tag.name}</p>
                    {tag.description && (
                      <p className="text-xs text-muted-foreground truncate">{tag.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleStartEdit(tag)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(tag.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {tags.length === 0 && !isCreating && (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">Nenhuma tag criada ainda</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
