import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  BarChart3,
  Copy,
  Check,
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import NpsResultsSheet from "./NpsResultsSheet";

interface NpsForm {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  active: boolean;
  product_id: string | null;
  created_at: string;
  products?: { name: string } | null;
}

interface FormData {
  title: string;
  slug: string;
  description: string;
  product_id: string;
  active: boolean;
}

const initialFormData: FormData = {
  title: "De 0 a 10, quanto você recomendaria este produto?",
  slug: "",
  description: "",
  product_id: "",
  active: true,
};

export default function NpsFormsList() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<NpsForm | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch NPS forms
  const { data: npsForms, isLoading } = useQuery({
    queryKey: ["nps_forms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nps_forms")
        .select("*, products(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as NpsForm[];
    },
  });

  // Fetch products for select
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from("nps_forms").insert({
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        product_id: data.product_id || null,
        active: data.active,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nps_forms"] });
      toast.success("Formulário NPS criado com sucesso!");
      setCreateOpen(false);
      setFormData(initialFormData);
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Este slug já está em uso. Escolha outro.");
      } else {
        toast.error("Erro ao criar formulário: " + error.message);
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const { error } = await supabase
        .from("nps_forms")
        .update({
          title: data.title,
          slug: data.slug,
          description: data.description || null,
          product_id: data.product_id || null,
          active: data.active,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nps_forms"] });
      toast.success("Formulário NPS atualizado!");
      setEditOpen(false);
      setSelectedForm(null);
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nps_forms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nps_forms"] });
      toast.success("Formulário NPS excluído!");
      setDeleteOpen(false);
      setSelectedForm(null);
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.slug) {
      toast.error("Slug é obrigatório");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm || !formData.slug) {
      toast.error("Slug é obrigatório");
      return;
    }
    updateMutation.mutate({ id: selectedForm.id, data: formData });
  };

  const openEditModal = (form: NpsForm) => {
    setSelectedForm(form);
    setFormData({
      title: form.title,
      slug: form.slug,
      description: form.description || "",
      product_id: form.product_id || "",
      active: form.active,
    });
    setEditOpen(true);
  };

  const openDeleteDialog = (form: NpsForm) => {
    setSelectedForm(form);
    setDeleteOpen(true);
  };

  const openResultsSheet = (form: NpsForm) => {
    setSelectedForm(form);
    setResultsOpen(true);
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/nps/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const FormFields = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label>Produto (opcional)</Label>
        <Select
          value={formData.product_id}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              product_id: value,
              slug: formData.slug || generateSlug(products?.find((p) => p.id === value)?.name || ""),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um produto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhum (Geral)</SelectItem>
            {products?.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Título/Pergunta</Label>
        <Input
          placeholder="De 0 a 10, quanto você recomendaria..."
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label>
          Slug (URL) <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="mentoria-jan-2024"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="font-mono"
          />
          {!isEdit && formData.product_id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const product = products?.find((p) => p.id === formData.product_id);
                if (product) {
                  setFormData({ ...formData, slug: generateSlug(product.name) });
                }
              }}
            >
              Gerar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          URL: /nps/{formData.slug || "seu-slug"}
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Descrição (opcional)</Label>
        <Textarea
          placeholder="Ajude-nos a melhorar..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={formData.active}
          onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
        />
        <Label>Formulário ativo</Label>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Crie formulários de satisfação NPS para seus produtos.
          </p>
          <Button
            onClick={() => {
              setFormData(initialFormData);
              setCreateOpen(true);
            }}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo NPS
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : npsForms && npsForms.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Formulário</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {npsForms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div>
                        <span className="font-semibold text-primary block">
                          {form.title}
                        </span>
                        <code className="text-xs text-muted-foreground">
                          /nps/{form.slug}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      {form.products?.name || (
                        <span className="text-muted-foreground">Geral</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {form.active ? (
                        <Badge className="bg-green-500/20 text-green-600 border-green-500/50">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyLink(form.slug)}
                            >
                              {copiedSlug === form.slug ? (
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
                              onClick={() => window.open(`/nps/${form.slug}`, "_blank")}
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
                              className="h-8 w-8 hover:bg-secondary/10 hover:text-secondary"
                              onClick={() => openResultsSheet(form)}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver resultados</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditModal(form)}
                            >
                              <Pencil className="h-4 w-4" />
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
                              onClick={() => openDeleteDialog(form)}
                            >
                              <Trash2 className="h-4 w-4" />
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
                Nenhum formulário NPS cadastrado. Clique em "Novo NPS" para começar.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-primary">Novo Formulário NPS</DialogTitle>
              <DialogDescription>
                Crie uma pesquisa de satisfação para coletar feedback.
              </DialogDescription>
            </DialogHeader>

            <FormFields />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar
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
              <DialogTitle className="text-primary">Editar Formulário NPS</DialogTitle>
              <DialogDescription>Atualize as configurações do formulário.</DialogDescription>
            </DialogHeader>

            <FormFields isEdit />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o formulário NPS{" "}
              <strong>"{selectedForm?.title}"</strong>?
              <br />
              <br />
              <span className="text-destructive font-medium">
                ⚠️ Todas as respostas coletadas também serão excluídas.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedForm && deleteMutation.mutate(selectedForm.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Results Sheet */}
      {selectedForm && (
        <NpsResultsSheet
          open={resultsOpen}
          onOpenChange={setResultsOpen}
          form={selectedForm}
        />
      )}
    </>
  );
}
