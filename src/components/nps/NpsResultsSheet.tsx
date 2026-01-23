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
    if (nps >= 50) return <TrendingUp className="h-5 w-5" />;
    if (nps >= 0) return <Minus className="h-5 w-5" />;
    return <TrendingDown className="h-5 w-5" />;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 9) {
      return (
        <Badge className="bg-green-500/20 text-green-600 border-green-500/50">
          Promotor ({score})
        </Badge>
      );
    }
    if (score >= 7) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/50">
          Neutro ({score})
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/20 text-red-600 border-red-500/50">
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
          <div className="mt-6 space-y-6">
            {/* NPS Score Card */}
            <div
              className={cn(
                "rounded-xl p-6 text-center",
                getNpsBg(metrics.nps)
              )}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className={getNpsColor(metrics.nps)}>
                  {getNpsIcon(metrics.nps)}
                </span>
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  NPS Score
                </span>
              </div>
              <div className={cn("text-5xl font-bold", getNpsColor(metrics.nps))}>
                {metrics.nps}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Baseado em {metrics.total} resposta{metrics.total !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Breakdown */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Distribuição
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Promotores (9-10)</span>
                    <span className="font-medium">
                      {metrics.promoters} ({Math.round((metrics.promoters / metrics.total) * 100)}%)
                    </span>
                  </div>
                  <Progress
                    value={(metrics.promoters / metrics.total) * 100}
                    className="h-2 bg-green-100 [&>div]:bg-green-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600">Neutros (7-8)</span>
                    <span className="font-medium">
                      {metrics.passives} ({Math.round((metrics.passives / metrics.total) * 100)}%)
                    </span>
                  </div>
                  <Progress
                    value={(metrics.passives / metrics.total) * 100}
                    className="h-2 bg-yellow-100 [&>div]:bg-yellow-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Detratores (0-6)</span>
                    <span className="font-medium">
                      {metrics.detractors} ({Math.round((metrics.detractors / metrics.total) * 100)}%)
                    </span>
                  </div>
                  <Progress
                    value={(metrics.detractors / metrics.total) * 100}
                    className="h-2 bg-red-100 [&>div]:bg-red-500"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Responses with feedback */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Comentários
                </h3>
              </div>

              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {responses.map((response) => (
                    <div
                      key={response.id}
                      className="rounded-lg border border-border p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        {getScoreBadge(response.score)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(response.created_at), "dd MMM yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      {response.feedback ? (
                        <p className="text-sm text-foreground">{response.feedback}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Sem comentário
                        </p>
                      )}
                    </div>
                  ))}
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
