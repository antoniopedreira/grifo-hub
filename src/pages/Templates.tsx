import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type TemplateType = Database["public"]["Enums"]["template_type"];
type Template = Database["public"]["Tables"]["page_templates"]["Row"];

interface TemplateForm {
  name: string;
  type: TemplateType | "";
  component_key: string;
}

export default function Templates() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const [createForm, setCreateForm] = useState<TemplateForm>({
    name: "",
    type: "",
    component_key: "",
  });

  const [editForm, setEditForm] = useState<{ name: string; type: TemplateType | "" }>({
    name: "",
    type: "",
  });

  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["page_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (form: TemplateForm) => {
      const { data: template, error: templateError } = await supabase
        .from("page_templates")
        .insert({
          name: form.name,
          type: form.type as TemplateType,
          component_key: form.component_key,
        })
        .select()
        .single();

      if (templateError) throw templateError;
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page_templates"] });
      toast.success("Template criado com sucesso!");
      setCreateOpen(false);
      setCreateForm({ name: "", type: "", component_key: "" });
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar template: " + error.message);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: { name: string; type: TemplateType | "" } }) => {
      const { error: templateError } = await supabase
        .from("page_templates")
        .update({ name: form.name, type: form.type as TemplateType })
        .eq("id", id);

      if (templateError) throw templateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page_templates"] });
      toast.success("Template atualizado com sucesso!");
      setEditOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar template: " + error.message);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      // Check if there are nps_forms linked
      const { data: npsForm } = await supabase
        .from("nps_forms")
        .select("id")
        .eq("template_id", id)
        .maybeSingle();

      // Delete NPS form first if exists
      if (npsForm) {
        const { error: npsError } = await supabase
          .from("nps_forms")
          .delete()
          .eq("id", npsForm.id);
        if (npsError) throw npsError;
      }

      // Delete template
      const { error } = await supabase.from("page_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page_templates"] });
      toast.success("Template excluído com sucesso!");
      setDeleteOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir template: " + error.message);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.name || !createForm.type || !createForm.component_key) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createTemplate.mutate(createForm);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTemplate || !editForm.name || !editForm.type) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    updateTemplate.mutate({ id: selectedTemplate.id, form: editForm });
  };

  const openEditModal = (template: Template) => {
    setSelectedTemplate(template);
    setEditForm({ name: template.name, type: template.type });
    setEditOpen(true);
  };

  const openDeleteDialog = (template: Template) => {
    setSelectedTemplate(template);
    setDeleteOpen(true);
  };

  const getTypeBadge = (type: TemplateType) => {
    switch (type) {
      case "landing_page":
        return <Badge className="bg-secondary text-secondary-foreground">Landing Page</Badge>;
      case "application_form":
        return (
          <Badge variant="outline" className="border-secondary text-secondary">
            Formulário
          </Badge>
        );
      case "nps_form":
        return (
          <Badge variant="outline" className="border-primary text-primary">
            NPS
          </Badge>
        );
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-bold text-primary">Templates</h1>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-muted-foreground">
            Templates de Landing Pages, Formulários e NPS para seus produtos.
          </p>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates && templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Chave</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <span className="font-semibold text-primary">{template.name}</span>
                    </TableCell>
                    <TableCell>{getTypeBadge(template.type)}</TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground font-mono">
                        {template.component_key}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-secondary/10 hover:text-secondary"
                              onClick={() => openEditModal(template)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => openDeleteDialog(template)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Excluir</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhum template cadastrado. Clique em "Novo Template" para começar.
              </p>
            </div>
          )}
        </div>

        {/* Create Modal */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="text-primary">Novo Template</DialogTitle>
                <DialogDescription>Crie um novo template para suas páginas.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-name">
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="create-name"
                    placeholder="Nome do template"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="focus-visible:ring-primary"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="create-type">
                    Tipo <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={createForm.type}
                    onValueChange={(value: TemplateType) =>
                      setCreateForm({ ...createForm, type: value })
                    }
                  >
                    <SelectTrigger className="focus:ring-primary">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landing_page">Landing Page</SelectItem>
                      <SelectItem value="application_form">Formulário</SelectItem>
                      <SelectItem value="nps_form">Formulário NPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="create-component_key">
                    Chave do Componente <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="create-component_key"
                    placeholder="ex: nps_webinar_cultura"
                    value={createForm.component_key}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, component_key: e.target.value })
                    }
                    className="focus-visible:ring-primary font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome exato do componente exportado no registry.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  disabled={createTemplate.isPending}
                >
                  {createTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleEdit}>
              <DialogHeader>
                <DialogTitle className="text-primary">Editar Template</DialogTitle>
                <DialogDescription>
                  Edite o template. A chave do componente não pode ser alterada.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    placeholder="Nome do template"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="focus-visible:ring-primary"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-type">
                    Tipo <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={editForm.type}
                    onValueChange={(value: TemplateType) =>
                      setEditForm({ ...editForm, type: value })
                    }
                  >
                    <SelectTrigger className="focus:ring-primary">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landing_page">Landing Page</SelectItem>
                      <SelectItem value="application_form">Formulário</SelectItem>
                      <SelectItem value="nps_form">Formulário NPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Chave do Componente</Label>
                    <code className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
                      {selectedTemplate.component_key}
                    </code>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  disabled={updateTemplate.isPending}
                >
                  {updateTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Atualizar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-primary">Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o template{" "}
                <strong>"{selectedTemplate?.name}"</strong>?
                <br />
                <br />
                <span className="text-destructive font-medium">
                  ⚠️ Se houver produtos usando este template, eles pararão de funcionar.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedTemplate && deleteTemplate.mutate(selectedTemplate.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteTemplate.isPending}
              >
                {deleteTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
