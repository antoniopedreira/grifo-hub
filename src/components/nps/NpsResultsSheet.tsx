import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, TrendingUp, TrendingDown, Minus, MessageSquare, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface NpsResultsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: {
    id: string;
    title: string;
    slug: string;
  };
}

interface NpsResponse {
  id: string;
  score: number;
  feedback: string | null;
  created_at: string;
}

// Map of field keys to human-readable labels
const QUESTION_LABELS: Record<string, string> = {
  score: "Nota NPS (0-10)",
  relevance: "Relevância do conteúdo",
  presentation: "Qualidade da apresentação",
  applicability: "Aplicabilidade no dia a dia",
  experience: "Experiência geral",
  learning_highlight: "O que mais aprendeu",
  improvement_suggestion: "Sugestão de melhoria",
  feedback: "Comentário adicional",
  recommendation: "Recomendaria?",
  satisfaction: "Satisfação",
  quality: "Qualidade",
  comments: "Comentários",
  nome: "Nome",
  email: "E-mail",
};

function getQuestionLabel(key: string): string {
  return QUESTION_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseFeedback(feedback: string | null): Record<string, string> | null {
  if (!feedback) return null;
  try {
    return JSON.parse(feedback);
  } catch {
    // If not JSON, return as single comment
    return { feedback };
  }
}

export default function NpsResultsSheet({ open, onOpenChange, form }: NpsResultsSheetProps) {
  // Fetch responses
  const { data: responses, isLoading } = useQuery({
    queryKey: ["nps-responses", form.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nps_responses")
        .select("*")
        .eq("form_id", form.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as NpsResponse[];
    },
    enabled: open,
  });

  // Calculate NPS metrics
  const calculateMetrics = () => {
    if (!responses || responses.length === 0) {
      return { nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };
    }

    const total = responses.length;
    const promoters = responses.filter((r) => r.score >= 9).length;
    const passives = responses.filter((r) => r.score >= 7 && r.score <= 8).length;
    const detractors = responses.filter((r) => r.score <= 6).length;

    const nps = Math.round(((promoters - detractors) / total) * 100);

    return { nps, promoters, passives, detractors, total };
  };

  const metrics = calculateMetrics();

  const getNpsColor = (nps: number) => {
    if (nps >= 50) return "text-green-500";
    if (nps >= 0) return "text-yellow-500";
    return "text-red-500";
  };

  const getNpsBg = (nps: number) => {
    if (nps >= 50) return "bg-green-500/10";
    if (nps >= 0) return "bg-yellow-500/10";
    return "bg-red-500/10";
  };

  const getNpsIcon = (nps: number) => {
    if (nps >= 50) return <TrendingUp className="h-4 w-4" />;
    if (nps >= 0) return <Minus className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 9) {
      return (
        <Badge className="bg-green-500/20 text-green-600 border-green-500/50 text-xs">
          Promotor ({score})
        </Badge>
      );
    }
    if (score >= 7) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/50 text-xs">
          Neutro ({score})
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/20 text-red-600 border-red-500/50 text-xs">
        Detrator ({score})
      </Badge>
    );
  };

  const handleViewPage = () => {
    window.open(`/nps/${form.slug}`, "_blank");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <SheetTitle className="text-primary">Resultados NPS</SheetTitle>
              <SheetDescription>{form.title}</SheetDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleViewPage}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Página
            </Button>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : responses && responses.length > 0 ? (
          <div className="mt-4 space-y-4">
            {/* Compact NPS Score + Distribution */}
            <div className="flex gap-3">
              {/* NPS Score - Compact */}
              <div
                className={cn(
                  "rounded-lg p-3 text-center flex-shrink-0 w-24",
                  getNpsBg(metrics.nps)
                )}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className={getNpsColor(metrics.nps)}>
                    {getNpsIcon(metrics.nps)}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">
                    NPS
                  </span>
                </div>
                <div className={cn("text-2xl font-bold", getNpsColor(metrics.nps))}>
                  {metrics.nps}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {metrics.total} resposta{metrics.total !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Distribution - Compact */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-green-600 w-20">Promotores</span>
                  <Progress
                    value={(metrics.promoters / metrics.total) * 100}
                    className="h-1.5 flex-1 bg-green-100 [&>div]:bg-green-500"
                  />
                  <span className="text-[10px] font-medium w-12 text-right">
                    {metrics.promoters} ({Math.round((metrics.promoters / metrics.total) * 100)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-yellow-600 w-20">Neutros</span>
                  <Progress
                    value={(metrics.passives / metrics.total) * 100}
                    className="h-1.5 flex-1 bg-yellow-100 [&>div]:bg-yellow-500"
                  />
                  <span className="text-[10px] font-medium w-12 text-right">
                    {metrics.passives} ({Math.round((metrics.passives / metrics.total) * 100)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-red-600 w-20">Detratores</span>
                  <Progress
                    value={(metrics.detractors / metrics.total) * 100}
                    className="h-1.5 flex-1 bg-red-100 [&>div]:bg-red-500"
                  />
                  <span className="text-[10px] font-medium w-12 text-right">
                    {metrics.detractors} ({Math.round((metrics.detractors / metrics.total) * 100)}%)
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Responses - Main focus area */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Respostas ({responses.length})
                </h3>
              </div>

              <ScrollArea className="h-[calc(100vh-320px)] pr-4">
                <div className="space-y-4">
                  {responses.map((response) => {
                    const parsedFeedback = parseFeedback(response.feedback);

                    return (
                      <div
                        key={response.id}
                        className="rounded-lg border border-border p-4 space-y-3"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          {getScoreBadge(response.score)}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(response.created_at), "dd MMM yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>

                        {/* Questions & Answers */}
                        {parsedFeedback ? (
                          <div className="space-y-2">
                            {Object.entries(parsedFeedback).map(([key, value]) => (
                              <div key={key} className="space-y-0.5">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {getQuestionLabel(key)}
                                </p>
                                <p className="text-sm text-foreground bg-muted/50 rounded px-2 py-1.5">
                                  {value || <span className="italic text-muted-foreground">Não respondido</span>}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Sem respostas adicionais
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-2">Nenhuma resposta ainda</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Compartilhe o link do formulário para começar a coletar feedback.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
