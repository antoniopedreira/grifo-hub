import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Building2, HardHat, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Esquema de Validação
const formSchema = z.object({
  full_name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  company_name: z.string().min(2, "Nome da construtora/empresa obrigatório"),
  role: z.enum([
    "socio_proprietario",
    "diretor_obras",
    "engenheiro_chefe",
    "arquiteto_coordenador",
    "gerente_projetos",
    "comprador",
    "outro"
  ], {
    required_error: "Selecione seu cargo",
  }),
  niche: z.enum([
    "incorporacao_residencial",
    "obras_comerciais",
    "obras_industriais",
    "reformas_alto_padrao",
    "infraestrutura",
    "obras_publicas",
    "projetos_arquitetura"
  ], {
    required_error: "Selecione a área de atuação",
  }),
  biggest_challenge: z.string().optional(),
});

interface FormConstructionProps {
  productId?: string;
  onSubmitSuccess?: () => void;
}

export function FormConstruction({ productId, onSubmitSuccess }: FormConstructionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      company_name: "",
      biggest_challenge: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // 1. Identificar ou Criar Lead
      // (Lógica simplificada - idealmente buscaria por email antes)
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          full_name: values.full_name,
          email: values.email,
          phone: values.phone,
          status: "Novo", // Status inicial
          // Armazenamos dados extras em metadados se houver campo JSON, 
          // ou apenas os campos padrão
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // 2. Salvar a Submissão do Formulário (Respostas completas)
      const { error: subError } = await supabase.from("form_submissions").insert({
        lead_id: lead.id,
        product_id: productId, // Vincula ao produto da landing page
        answers: {
          role: values.role,
          company: values.company_name,
          niche: values.niche,
          challenge: values.biggest_challenge
        }
      });

      if (subError) throw subError;

      toast.success("Aplicação recebida com sucesso!");
      form.reset();
      if (onSubmitSuccess) onSubmitSuccess();

    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar formulário. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-card border rounded-xl shadow-sm p-6 md:p-8">
      <div className="mb-8 text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
          <HardHat className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Formulário de Aplicação
        </h2>
        <p className="text-muted-foreground">
          Preencha os dados abaixo para que nossos especialistas analisem o perfil da sua construtora.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Dados Pessoais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} />
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
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Corporativo</FormLabel>
                <FormControl>
                  <Input placeholder="seu@empresa.com.br" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Dados da Empresa */}
          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Construtora / Engenharia</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Nome da empresa" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Pergunta Específica 1: Cargo */}
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="space-y-3 bg-muted/30 p-4 rounded-lg border">
                <FormLabel className="text-base font-semibold">Qual seu cargo atual na empresa?</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-1 md:grid-cols-2 gap-2"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="socio_proprietario" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Sócio / Proprietário</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="diretor_obras" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Diretor de Obras</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="engenheiro_chefe" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Engenheiro Chefe</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="arquiteto_coordenador" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Arquiteto Coord.</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="comprador" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Suprimentos / Compras</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="outro" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Outro</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Pergunta Específica 2: Nicho de Atuação */}
          <FormField
            control={form.control}
            name="niche"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qual a principal área de atuação da empresa?</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o nicho principal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="incorporacao_residencial">Incorporação Residencial (Prédios/Casas)</SelectItem>
                    <SelectItem value="obras_comerciais">Obras Comerciais e Corporativas</SelectItem>
                    <SelectItem value="obras_industriais">Galpões e Obras Industriais</SelectItem>
                    <SelectItem value="reformas_alto_padrao">Reformas de Alto Padrão</SelectItem>
                    <SelectItem value="infraestrutura">Infraestrutura e Loteamentos</SelectItem>
                    <SelectItem value="obras_publicas">Obras Públicas / Licitações</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="biggest_challenge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qual o maior desafio da construtora hoje? (Opcional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Ex: Controle de custos, prazo de entrega, gestão de compras..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando Aplicação...
              </>
            ) : (
              <>
                Enviar Aplicação <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
