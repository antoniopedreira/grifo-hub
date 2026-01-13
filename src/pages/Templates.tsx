import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Loader2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface NewTemplateForm {
  name: string;
  type: TemplateType | "";
  component_key: string;
}

export default function Templates() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewTemplateForm>({
    name: "",
    type: "",
    component_key: "",
  });
  
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["page_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_templates")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (newTemplate: { name: string; type: TemplateType; component_key: string }) => {
      const { data, error } = await supabase
        .from("page_templates")
        .insert(newTemplate)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page_templates"] });
      toast.success("Template criado com sucesso!");
      setOpen(false);
      setForm({ name: "", type: "", component_key: "" });
    },
    onError: (error) => {
      toast.error("Erro ao criar template: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.type || !form.component_key) {
      toast.error("Preencha todos os campos");
      return;
    }

    createTemplate.mutate({
      name: form.name,
      type: form.type as TemplateType,
      component_key: form.component_key,
    });
  };

  const getTypeBadge = (type: TemplateType) => {
    switch (type) {
      case "landing_page":
        return <Badge className="bg-secondary text-secondary-foreground">Landing Page</Badge>;
      case "application_form":
        return <Badge variant="outline" className="border-secondary text-secondary">Formulário</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-bold text-primary">Templates</h1>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-primary">Novo Template</DialogTitle>
                <DialogDescription>
                  Crie um novo template para suas páginas.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Nome do template"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value: TemplateType) => setForm({ ...form, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landing_page">Landing Page</SelectItem>
                      <SelectItem value="application_form">Formulário de Aplicação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="component_key">Chave do Componente</Label>
                  <Input
                    id="component_key"
                    placeholder="ex: LandingPagePremium"
                    value={form.component_key}
                    onChange={(e) => setForm({ ...form, component_key: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome técnico do arquivo React (sem extensão)
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  disabled={createTemplate.isPending}
                >
                  {createTemplate.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Chave do Componente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{getTypeBadge(template.type)}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {template.component_key}
                    </code>
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
    </div>
  );
}
