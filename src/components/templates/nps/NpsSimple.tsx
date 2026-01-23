import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NpsTemplateProps } from "./types";

export default function NpsSimple({ form, productName }: NpsTemplateProps) {
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (score === null) {
        throw new Error("Selecione uma nota");
      }

      const { error } = await supabase.from("nps_responses").insert({
        form_id: form.id,
        score,
        feedback: feedback.trim() || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error) => {
      console.error("Error submitting NPS:", error);
      toast.error("Erro ao enviar resposta. Tente novamente.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (score === null) {
      toast.error("Selecione uma nota antes de enviar");
      return;
    }
    submitMutation.mutate();
  };

  const getScoreStyle = (value: number, isSelected: boolean) => {
    const baseStyle = "w-10 h-10 rounded-lg border-2 font-semibold transition-all";
    
    if (isSelected) {
      if (value <= 6) return cn(baseStyle, "bg-red-500 border-red-500 text-white scale-110");
      if (value <= 8) return cn(baseStyle, "bg-yellow-500 border-yellow-500 text-white scale-110");
      return cn(baseStyle, "bg-green-500 border-green-500 text-white scale-110");
    }
    
    return cn(baseStyle, "bg-card border-border text-muted-foreground hover:border-primary hover:text-primary");
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Obrigado!</h1>
          <p className="text-muted-foreground">
            Sua opinião foi registrada com sucesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 md:p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {form.title}
            </h1>
            {productName && (
              <p className="text-primary font-medium mt-1">{productName}</p>
            )}
            {form.description && (
              <p className="text-muted-foreground mt-2">{form.description}</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-center gap-1 md:gap-2 flex-wrap">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScore(value)}
                  className={getScoreStyle(value, score === value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>Nada provável</span>
              <span>Muito provável</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Comentário (opcional)
            </label>
            <Textarea
              placeholder="Conte-nos mais sobre sua experiência..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[100px] resize-none"
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={score === null || submitMutation.isPending}
            className="w-full"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Enviar Avaliação
          </Button>
        </form>
      </div>
    </div>
  );
}
