import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  BarChart3,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import NpsResultsSheet from "@/components/nps/NpsResultsSheet";

type TemplateType = Database["public"]["Enums"]["template_type"];
type Template = Database["public"]["Tables"]["page_templates"]["Row"] & {
  nps_forms?: Array<{
    id: string;
    slug: string;
    active: boolean;
    product_id: string | null;
    products?: { name: string } | null;
  }>;
};

interface TemplateForm {
  name: string;
  type: TemplateType | "";
  component_key: string;
  // NPS-specific fields
  nps_slug: string;
  nps_product_id: string;
  nps_description: string;
  nps_active: boolean;
}

interface EditTemplateForm {
  name: string;
  type: TemplateType | "";
  // NPS-specific fields
  nps_slug: string;
  nps_product_id: string;
  nps_description: string;
  nps_active: boolean;
}

// Available NPS component keys for the select
const NPS_COMPONENTS = [
  { key: "nps_premium", label: "NPS Premium (Padrão)" },
  { key: "nps_simple", label: "NPS Simples" },
  { key: "nps_cards", label: "NPS Cards Emoji" },
];

export default function Templates() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<TemplateForm>({
    name: "",
    type: "",
    component_key: "",
    nps_slug: "",
    nps_product_id: "",
    nps_description: "",
    nps_active: true,
  });

  const [editForm, setEditForm] = useState<EditTemplateForm>({
    name: "",
    type: "",
    nps_slug: "",
    nps_product_id: "",
    nps_description: "",
    nps_active: true,
  });

  const queryClient = useQueryClient();

  // Fetch templates with NPS data joined
  const { data: templates, isLoading } = useQuery({
    queryKey: ["page_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_templates")
        .select("*, nps_forms(id, slug, active, product_id, products(name))")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
  });

  // Fetch products for NPS select
  const { data: products } = useQuery({
    queryKey: ["products-for-nps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (form: TemplateForm) => {
      // Create the template
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

      // If it's NPS type, create the nps_forms record
      if (form.type === "nps_form") {
        const { error: npsError } = await supabase.from("nps_forms").insert({
          template_id: template.id,
          title: form.name,
          slug: form.nps_slug,
          description: form.nps_description || null,
          product_id: form.nps_product_id || null,
          active: form.nps_active,
        });

        if (npsError) throw npsError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page_templates"] });
      toast.success("Template criado com sucesso!");
      setCreateOpen(false);
      setCreateForm({
        name: "",
        type: "",
        component_key: "",
        nps_slug: "",
        nps_product_id: "",
        nps_description: "",
        nps_active: true,
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        toast.error("Este slug já está em uso. Escolha outro.");
      } else {
        toast.error("Erro ao criar template: " + error.message);
      }
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      form,
      npsFormId,
    }: {
      id: string;
      form: EditTemplateForm;
      npsFormId?: string;
    }) => {
      // Update the template
      const { error: templateError } = await supabase
        .from("page_templates")
        .update({ name: form.name, type: form.type as TemplateType })
        .eq("id", id);

      if (templateError) throw templateError;

      // If it's NPS and has form, update it
      if (form.type === "nps_form" && npsFormId) {
        const { error: npsError } = await supabase
          .from("nps_forms")
          .update({
            title: form.name,
            slug: form.nps_slug,
            description: form.nps_description || null,
            product_id: form.nps_product_id || null,
            active: form.nps_active,
          })
          .eq("id", npsFormId);

        if (npsError) throw npsError;
      }
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
    mutationFn: async ({ id, npsFormId }: { id: string; npsFormId?: string }) => {
      // Delete NPS form first if exists (due to FK)
      if (npsFormId) {
        const { error: npsError } = await supabase
          .from("nps_forms")
          .delete()
          .eq("id", npsFormId);
        if (npsError) throw npsError;
      }

      // Delete template
      const { error } = await supabase
        .from("page_templates")
        .delete()
        .eq("id", id);

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

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.name || !createForm.type || !createForm.component_key) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // NPS-specific validation
    if (createForm.type === "nps_form" && !createForm.nps_slug) {
      toast.error("Slug é obrigatório para formulários NPS");
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

    // NPS-specific validation
    if (editForm.type === "nps_form" && !editForm.nps_slug) {
      toast.error("Slug é obrigatório para formulários NPS");
      return;
    }

    const npsFormId = selectedTemplate.nps_forms?.[0]?.id;

    updateTemplate.mutate({
      id: selectedTemplate.id,
      form: editForm,
      npsFormId,
    });
  };

  const openEditModal = (template: Template) => {
    setSelectedTemplate(template);
    const npsForm = template.nps_forms?.[0];
    setEditForm({
      name: template.name,
      type: template.type,
      nps_slug: npsForm?.slug || "",
      nps_product_id: npsForm?.product_id || "",
      nps_description: "",
      nps_active: npsForm?.active ?? true,
    });
    setEditOpen(true);
  };

  const openDeleteDialog = (template: Template) => {
    setSelectedTemplate(template);
    setDeleteOpen(true);
  };

  const openResultsSheet = (template: Template) => {
    setSelectedTemplate(template);
    setResultsOpen(true);
  };

  const copyNpsLink = (slug: string) => {
    const url = `${window.location.origin}/nps/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedSlug(null), 2000);
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
                  <TableHead>Detalhes</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const npsForm = template.nps_forms?.[0];
                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-semibold text-primary cursor-help">
                              {template.name}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="bg-primary text-primary-foreground"
                          >
                            <p className="text-xs">
                              <span className="text-muted-foreground">Component:</span>{" "}
                              <code className="font-mono">{template.component_key}</code>
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        {npsForm && (
                          <code className="text-xs text-muted-foreground block">
                            /nps/{npsForm.slug}
                          </code>
                        )}
                      </TableCell>
                      <TableCell>{getTypeBadge(template.type)}</TableCell>
                      <TableCell>
                        {template.type === "nps_form" && npsForm ? (
                          <div className="flex items-center gap-2">
                            {npsForm.active ? (
                              <Badge className="bg-green-500/20 text-green-600 border-green-500/50">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                            {npsForm.products?.name && (
                              <span className="text-xs text-muted-foreground">
                                • {npsForm.products.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {template.type === "nps_form" && npsForm && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => copyNpsLink(npsForm.slug)}
                                  >
                                    {copiedSlug === npsForm.slug ? (
                                      <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copiar link</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => window.open(`/nps/${npsForm.slug}`, "_blank")}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Abrir formulário</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                    onClick={() => openResultsSheet(template)}
                                  >
                                    <BarChart3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver resultados</TooltipContent>
                              </Tooltip>
                            </>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-secondary/10 hover:text-secondary"
                            onClick={() => openEditModal(template)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => openDeleteDialog(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
                  <Label htmlFor="create-name">Nome</Label>
                  <Input
                    id="create-name"
                    placeholder="Nome do template"
                    value={createForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCreateForm({
                        ...createForm,
                        name,
                        nps_slug: createForm.type === "nps_form" ? generateSlug(name) : "",
                      });
                    }}
                    className="focus-visible:ring-primary"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="create-type">Tipo</Label>
                  <Select
                    value={createForm.type}
                    onValueChange={(value: TemplateType) =>
                      setCreateForm({
                        ...createForm,
                        type: value,
                        component_key: value === "nps_form" ? "nps_premium" : createForm.component_key,
                        nps_slug: value === "nps_form" ? generateSlug(createForm.name) : "",
                      })
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

                {createForm.type === "nps_form" ? (
                  <>
                    <div className="grid gap-2">
                      <Label>Visual do NPS</Label>
                      <Select
                        value={createForm.component_key}
                        onValueChange={(value) =>
                          setCreateForm({ ...createForm, component_key: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o visual" />
                        </SelectTrigger>
                        <SelectContent>
                          {NPS_COMPONENTS.map((comp) => (
                            <SelectItem key={comp.key} value={comp.key}>
                              {comp.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>
                        Slug (URL) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="meu-nps"
                        value={createForm.nps_slug}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, nps_slug: e.target.value })
                        }
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        URL: /nps/{createForm.nps_slug || "seu-slug"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={createForm.nps_active}
                        onCheckedChange={(checked) =>
                          setCreateForm({ ...createForm, nps_active: checked })
                        }
                      />
                      <Label>Formulário ativo</Label>
                    </div>
                  </>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="create-component_key">
                      Chave do Componente <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="create-component_key"
                      placeholder="ex: LandingPagePremium"
                      value={createForm.component_key}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, component_key: e.target.value })
                      }
                      className="focus-visible:ring-primary font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Nome exato do arquivo React exportado no registry (sem extensão).
                    </p>
                  </div>
                )}
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
                  Edite o template. O vínculo técnico (component_key) não pode ser alterado.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Nome</Label>
                  <Input
                    id="edit-name"
                    placeholder="Nome do template"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="focus-visible:ring-primary"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-type">Tipo</Label>
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

                {editForm.type === "nps_form" && selectedTemplate?.nps_forms?.[0] && (
                  <>
                    <div className="grid gap-2">
                      <Label>
                        Slug (URL) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="meu-nps"
                        value={editForm.nps_slug}
                        onChange={(e) => setEditForm({ ...editForm, nps_slug: e.target.value })}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        URL: /nps/{editForm.nps_slug || "seu-slug"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editForm.nps_active}
                        onCheckedChange={(checked) =>
                          setEditForm({ ...editForm, nps_active: checked })
                        }
                      />
                      <Label>Formulário ativo</Label>
                    </div>
                  </>
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
                  {selectedTemplate?.type === "nps_form" &&
                    " O formulário NPS associado também será excluído."}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  selectedTemplate &&
                  deleteTemplate.mutate({
                    id: selectedTemplate.id,
                    npsFormId: selectedTemplate.nps_forms?.[0]?.id,
                  })
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteTemplate.isPending}
              >
                {deleteTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* NPS Results Sheet */}
        {selectedTemplate?.nps_forms?.[0] && (
          <NpsResultsSheet
            open={resultsOpen}
            onOpenChange={setResultsOpen}
            form={{
              id: selectedTemplate.nps_forms[0].id,
              title: selectedTemplate.name,
              slug: selectedTemplate.nps_forms[0].slug,
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
