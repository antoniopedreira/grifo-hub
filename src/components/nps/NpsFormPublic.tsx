import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NpsFormPublicProps {
  form: {
    id: string;
    title: string;
    description?: string | null;
    product_id?: string | null;
  };
  productName?: string;
}

export default function NpsFormPublic({ form, productName }: NpsFormPublicProps) {
  const [currentStep, setCurrentStep] = useState(0);
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

  const handleScoreSelect = (value: number) => {
    setScore(value);
    // Auto-advance after selecting score
    setTimeout(() => setCurrentStep(1), 300);
  };

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  const getScoreColor = (value: number) => {
    if (value <= 6) return "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30";
    if (value <= 8) return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30";
    return "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30";
  };

  const getScoreSelectedColor = (value: number) => {
    if (value <= 6) return "bg-red-500 border-red-500 text-white";
    if (value <= 8) return "bg-yellow-500 border-yellow-500 text-white";
    return "bg-green-500 border-green-500 text-white";
  };

  const progress = currentStep === 0 ? 50 : 100;

  // Success screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg"
        >
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-secondary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Obrigado!
          </h1>
          <p className="text-white/70 text-lg mb-8">
            Sua opinião é muito importante para nós. Agradecemos por dedicar seu tempo para nos ajudar a melhorar.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 bg-white/10 w-full">
        <motion.div
          className="h-full bg-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Step 0: Score */}
            {currentStep === 0 && (
              <motion.div
                key="score"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="text-center mb-8">
                  <p className="text-secondary text-sm font-medium mb-2 uppercase tracking-wider">
                    Pesquisa de Satisfação
                  </p>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
                    {form.title || "De 0 a 10, quanto você recomendaria"}
                    {productName && !form.title && (
                      <span className="text-secondary"> {productName}</span>
                    )}
                    {!form.title && " para um amigo?"}
                  </h1>
                  {form.description && (
                    <p className="text-white/60 mt-4 text-lg">{form.description}</p>
                  )}
                </div>

                {/* Score Grid */}
                <div className="grid grid-cols-11 gap-2 md:gap-3">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <motion.button
                      key={value}
                      onClick={() => handleScoreSelect(value)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "aspect-square rounded-xl border-2 flex items-center justify-center",
                        "text-lg md:text-xl font-bold transition-all duration-200",
                        score === value
                          ? getScoreSelectedColor(value)
                          : getScoreColor(value)
                      )}
                    >
                      {value}
                    </motion.button>
                  ))}
                </div>

                {/* Labels */}
                <div className="flex justify-between text-sm text-white/50 px-1">
                  <span>Nada provável</span>
                  <span>Muito provável</span>
                </div>
              </motion.div>
            )}

            {/* Step 1: Feedback */}
            {currentStep === 1 && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="text-center mb-8">
                  <div className="mb-4">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold",
                        score !== null && getScoreSelectedColor(score)
                      )}
                    >
                      {score}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                    {score !== null && score <= 6
                      ? "O que podemos melhorar?"
                      : score !== null && score <= 8
                      ? "Como podemos fazer melhor?"
                      : "O que você mais gostou?"}
                  </h1>
                  <p className="text-white/60 mt-4 text-lg">
                    Sua opinião nos ajuda a evoluir (opcional)
                  </p>
                </div>

                <Textarea
                  placeholder="Conte-nos mais sobre sua experiência..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[150px] text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-secondary resize-none"
                />

                {/* Actions */}
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(0)}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    Voltar
                  </Button>

                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Enviar Resposta"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
