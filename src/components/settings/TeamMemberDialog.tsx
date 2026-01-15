import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Esquema de validação
const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(14, "Telefone inválido").optional().or(z.literal("")),
  role: z.string().min(1, "Selecione um cargo"),
});

interface TeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberToEdit?: any;
  onSuccess: () => void;
}

// Função auxiliar de máscara de telefone
const formatPhone = (value: string) => {
  if (!value) return "";

  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");

  // Aplica a máscara (XX) XXXXX-XXXX
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

export function TeamMemberDialog({ open, onOpenChange, memberToEdit, onSuccess }: TeamMemberDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "Sales",
    },
  });

  // Carrega dados se for edição
  useEffect(() => {
    if (memberToEdit) {
      form.reset({
        name: memberToEdit.name,
        email: memberToEdit.email || "",
        phone: formatPhone(memberToEdit.phone || ""), // Aplica máscara ao carregar
        role: memberToEdit.role || "Sales",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        phone: "",
        role: "Sales",
      });
    }
  }, [memberToEdit, form, open]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Remove a máscara antes de salvar no banco (opcional, mas recomendado)
      // Se preferir salvar com máscara, remova esta linha:
      // const cleanPhone = values.phone?.replace(/\D/g, "") || null;
      // Vou manter como está no formulário para consistência visual ou salvar limpo:

      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone, // Salvando com máscara para exibir formatado
        role: values.role,
      };

      if (memberToEdit) {
        const { error } = await supabase.from("team_members").update(payload).eq("id", memberToEdit.id);

        if (error) throw error;
        toast.success("Membro atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("team_members").insert([payload]);

        if (error) throw error;
        toast.success("Membro adicionado com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{memberToEdit ? "Editar Membro" : "Novo Membro da Equipe"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="joao@empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp / Telefone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(11) 99999-9999"
                      {...field}
                      onChange={(e) => {
                        // Aplica a máscara enquanto digita
                        const formatted = formatPhone(e.target.value);
                        // Limita o tamanho máximo (15 caracteres para "(11) 99999-9999")
                        if (formatted.length <= 15) {
                          field.onChange(formatted);
                        }
                      }}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo / Função</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Admin">Administrador</SelectItem>
                      <SelectItem value="Sales">Comercial / Vendas</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Support">Suporte</SelectItem>
                      <SelectItem value="Closer">Closer</SelectItem>
                      <SelectItem value="SDR">SDR</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
