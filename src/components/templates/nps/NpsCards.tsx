import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NpsTemplateProps } from "./types";

const emojiRanges = [
  { range: [0, 1, 2], emoji: "😡", label: "Muito Insatisfeito", color: "from-red-500 to-red-600" },
  { range: [3, 4], emoji: "😕", label: "Insatisfeito", color: "from-orange-500 to-orange-600" },
  { range: [5, 6], emoji: "😐", label: "Neutro", color: "from-yellow-500 to-yellow-600" },
  { range: [7, 8], emoji: "😊", label: "Satisfeito", color: "from-lime-500 to-lime-600" },
  { range: [9, 10], emoji: "🤩", label: "Muito Satisfeito", color: "from-green-500 to-green-600" },
];

export default function NpsCards({ form, productName }: NpsTemplateProps) {
  const [selectedRange, setSelectedRange] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [step, setStep] = useState(0);
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

  const handleCardSelect = (index: number) => {
    setSelectedRange(index);
    setStep(1);
  };

  const handleScoreSelect = (value: number) => {
    setScore(value);
    setStep(2);
  };

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary/90 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-lg"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-8xl mb-6"
          >
            🎉
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Obrigado pela avaliação!
          </h1>
          <p className="text-white/70 text-lg">
            Sua opinião nos ajuda a melhorar cada vez mais.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary/90 flex flex-col">
      {/* Progress indicator */}
      <div className="flex justify-center gap-2 pt-6">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              s <= step ? "w-8 bg-secondary" : "w-2 bg-white/20"
            )}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            {/* Step 0: Select sentiment */}
            {step === 0 && (
              <motion.div
                key="sentiment"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {form.title}
                  </h1>
                  {productName && (
                    <p className="text-secondary text-lg font-medium">{productName}</p>
                  )}
                  {form.description && (
                    <p className="text-white/60 mt-2">{form.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                  {emojiRanges.map((item, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleCardSelect(index)}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "p-4 md:p-6 rounded-2xl bg-gradient-to-br text-white",
                        "shadow-lg hover:shadow-xl transition-shadow",
                        item.color
                      )}
                    >
                      <div className="text-4xl md:text-5xl mb-2">{item.emoji}</div>
                      <div className="text-xs md:text-sm font-medium opacity-90">
                        {item.label}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 1: Select exact score */}
            {step === 1 && selectedRange !== null && (
              <motion.div
                key="score"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">{emojiRanges[selectedRange].emoji}</div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    Qual nota você daria?
                  </h2>
                </div>

                <div className="flex justify-center gap-3 flex-wrap">
                  {emojiRanges[selectedRange].range.map((value) => (
                    <motion.button
                      key={value}
                      onClick={() => handleScoreSelect(value)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        "w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm",
                        "text-2xl font-bold text-white border-2 border-white/30",
                        "hover:bg-white/30 hover:border-white/50 transition-all"
                      )}
                    >
                      {value}
                    </motion.button>
                  ))}
                </div>

                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(0)}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    Voltar
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Feedback */}
            {step === 2 && score !== null && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 max-w-xl mx-auto"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm text-3xl font-bold text-white mb-4"
                  >
                    {score}
                  </motion.div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    Quer nos contar mais?
                  </h2>
                  <p className="text-white/60 mt-2">Opcional, mas muito valioso!</p>
                </div>

                <Textarea
                  placeholder="O que você gostou? O que podemos melhorar?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[120px] text-lg bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-secondary resize-none rounded-xl"
                />

                <div className="flex items-center justify-between gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    Voltar
                  </Button>

                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8 rounded-xl"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Enviar
                      </>
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
