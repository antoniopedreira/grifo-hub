import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Building2, DollarSign, Calendar, User, Mail, Phone, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FormAnswersPanelProps {
  leadId: string | null;
  productId: string | null;
}

// Map of answer keys to readable labels
const ANSWER_KEY_LABELS: Record<string, { label: string; icon?: React.ElementType }> = {
  full_name: { label: "Nome", icon: User },
  email: { label: "E-mail", icon: Mail },
  phone: { label: "Telefone", icon: Phone },
  company_revenue: { label: "Faturamento", icon: DollarSign },
  faturamento: { label: "Faturamento", icon: DollarSign },
  empresa: { label: "Empresa", icon: Building2 },
  segmento: { label: "Segmento", icon: Globe },
  cargo: { label: "Cargo", icon: User },
  desafio: { label: "Maior Desafio" },
  objetivo: { label: "Objetivo" },
  prazo: { label: "Prazo", icon: Calendar },
  investimento: { label: "Investimento", icon: DollarSign },
  como_conheceu: { label: "Como nos conheceu" },
  site: { label: "Site", icon: Globe },
  instagram: { label: "Instagram" },
  linkedin: { label: "LinkedIn" },
};

// Format revenue values to readable text
const formatRevenueValue = (value: string | number): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return String(value);
  
  if (numValue === 0) return "Até R$ 500 mil";
  if (numValue <= 500000) return "Até R$ 500 mil";
  if (numValue <= 1000000) return "R$ 500 mil - R$ 1 mi";
  if (numValue <= 5000000) return "R$ 1 mi - R$ 5 mi";
  if (numValue <= 10000000) return "R$ 5 mi - R$ 10 mi";
  if (numValue <= 50000000) return "R$ 10 mi - R$ 50 mi";
  return "Acima de R$ 50 mi";
};

// Check if a key is related to revenue
const isRevenueKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return lowerKey.includes("revenue") || lowerKey.includes("faturamento");
};

export function FormAnswersPanel({ leadId, productId }: FormAnswersPanelProps) {
  // Fetch all form submissions for this lead
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["form-submissions-lead", leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from("form_submissions")
        .select("*, products(name)")
        .eq("lead_id", leadId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">Nenhum formulário respondido</p>
        <p className="text-xs mt-1">O lead ainda não preencheu nenhum formulário.</p>
      </div>
    );
  }

  const renderAnswer = (key: string, value: string | number | boolean) => {
    const config = ANSWER_KEY_LABELS[key.toLowerCase()] || { label: key };
    const Icon = config.icon;
    
    let displayValue = String(value);
    
    // Format revenue values
    if (isRevenueKey(key) && typeof value !== "boolean" && (typeof value === "number" || !isNaN(Number(value)))) {
      displayValue = formatRevenueValue(value);
    }
    
    // Format boolean values
    if (typeof value === "boolean") {
      displayValue = value ? "Sim" : "Não";
    }

    return (
      <div key={key} className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{config.label}</p>
          <p className="text-sm font-medium break-words">{displayValue}</p>
        </div>
      </div>
    );
  };

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4 pr-3">
        {submissions.map((submission, index) => {
          const answers = submission.answers as Record<string, string | number | boolean>;
          const productName = (submission as any).products?.name;
          
          return (
            <div key={submission.id} className="space-y-2">
              {/* Submission Header */}
              <div className="flex items-center justify-between gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-secondary" />
                  <span className="text-sm font-semibold text-primary">
                    {productName || `Formulário ${submissions.length - index}`}
                  </span>
                </div>
                {submission.submitted_at && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {format(new Date(submission.submitted_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </Badge>
                )}
              </div>

              {/* Answers Grid */}
              <div className="bg-muted/30 rounded-lg p-3 border">
                {Object.entries(answers).map(([key, value]) => renderAnswer(key, value))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
