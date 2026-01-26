import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X, Pencil, Check, Trash2, MessageSquareText, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";

interface WhatsAppTemplate {
  id: string;
  title: string;
  content: string;
  order_index: number;
  active: boolean;
}

interface WhatsAppQuickRepliesProps {
  onSelectTemplate: (content: string) => void;
}

export function WhatsAppQuickReplies({ onSelectTemplate }: WhatsAppQuickRepliesProps) {
  const queryClient = useQueryClient();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("active", true)
        .order("order_index");

      if (error) throw error;
      return data as WhatsAppTemplate[];
    },
  });

  // Reorder mutation with optimistic update
  const reorderMutation = useMutation({
    mutationFn: async (reorderedTemplates: WhatsAppTemplate[]) => {
      const updates = reorderedTemplates.map((t, index) => 
        supabase
          .from("whatsapp_templates")
          .update({ order_index: index })
          .eq("id", t.id)
      );
      const results = await Promise.all(updates);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onMutate: async (reorderedTemplates) => {
      await queryClient.cancelQueries({ queryKey: ["whatsapp-templates"] });
      const previousTemplates = queryClient.getQueryData<WhatsAppTemplate[]>(["whatsapp-templates"]);
      queryClient.setQueryData(["whatsapp-templates"], reorderedTemplates.map((t, i) => ({ ...t, order_index: i })));
      return { previousTemplates };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTemplates) {
        queryClient.setQueryData(["whatsapp-templates"], context.previousTemplates);
      }
      toast.error("Erro ao reordenar templates");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    
    const reordered = Array.from(templates);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    
    reorderMutation.mutate(reordered);
  };

  // Add template mutation
  const addTemplateMutation = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const { error } = await supabase
        .from("whatsapp_templates")
        .insert({ title, content, order_index: templates.length + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      setNewTitle("");
      setNewContent("");
      setIsAdding(false);
      toast.success("Template criado!");
    },
    onError: () => {
      toast.error("Erro ao criar template");
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const { error } = await supabase
        .from("whatsapp_templates")
        .update({ title, content })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      setEditingId(null);
      toast.success("Template atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar template");
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_templates")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success("Template removido!");
    },
    onError: () => {
      toast.error("Erro ao remover template");
    },
  });

  const handleStartEdit = (template: WhatsAppTemplate) => {
    setEditingId(template.id);
    setEditTitle(template.title);
    setEditContent(template.content);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editTitle.trim() || !editContent.trim()) return;
    updateTemplateMutation.mutate({ id: editingId, title: editTitle, content: editContent });
  };

  const handleAddNew = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    addTemplateMutation.mutate({ title: newTitle, content: newContent });
  };

  if (templates.length === 0) {
    return (
      <div className="flex items-center gap-2 px-1 py-2">
        <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
              <Plus className="h-3 w-3" />
              Criar respostas rápidas
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-secondary" />
                Gerenciar Respostas Rápidas
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <Input
                  placeholder="Nome do template (ex: Boas vindas)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Conteúdo da mensagem..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddNew}
                  disabled={!newTitle.trim() || !newContent.trim() || addTemplateMutation.isPending}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Criar Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Quick Reply Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {templates.slice(0, 6).map((template) => (
          <Button
            key={template.id}
            variant="outline"
            size="sm"
            onClick={() => onSelectTemplate(template.content)}
            className="h-7 px-2.5 text-xs bg-background hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
          >
            {template.title}
          </Button>
        ))}
        
        {/* Manage Templates Button */}
        <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-secondary" />
                Gerenciar Respostas Rápidas
              </DialogTitle>
            </DialogHeader>
            
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="templates">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3 mt-4"
                  >
                    {/* Existing Templates */}
                    {templates.map((template, index) => (
                      <Draggable key={template.id} draggableId={template.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-3 border rounded-lg bg-card transition-shadow ${
                              snapshot.isDragging ? "shadow-lg ring-2 ring-secondary/50" : ""
                            }`}
                          >
                            {editingId === template.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  placeholder="Nome"
                                />
                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  rows={2}
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingId(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    disabled={updateTemplateMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded shrink-0 mt-0.5"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{template.title}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {template.content}
                                  </p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleStartEdit(template)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => deleteTemplateMutation.mutate(template.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* Add New Template */}
                    {isAdding ? (
                      <div className="space-y-2 p-3 border rounded-lg bg-muted/30 border-dashed">
                        <Input
                          placeholder="Nome do template"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                        />
                        <Textarea
                          placeholder="Conteúdo da mensagem..."
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsAdding(false);
                              setNewTitle("");
                              setNewContent("");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAddNew}
                            disabled={!newTitle.trim() || !newContent.trim() || addTemplateMutation.isPending}
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full border-dashed"
                        onClick={() => setIsAdding(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Template
                      </Button>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
