import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NpsTemplateProps } from "./types";
import grifoLogo from "@/assets/grifo-logo.png";

type ParticipationType = "online" | "presencial" | null;
type GbcMember = "sim" | "nao" | null;

interface FormData {
  // Bloco 1
  gbc_member: GbcMember;
  participation_type: ParticipationType;
  
  // Bloco 2A - Online
  online_experience_rating: number | null;
  want_presential: string | null;
  will_organize_presential: string | null;
  online_liked: string;
  online_improve: string;
  
  // Bloco 2B - Presencial
  presential_difference_rating: number | null;
  presential_experience_rating: number | null;
  connections_made: string | null;
  presential_liked: string;
  
  // Bloco 3 - Geral
  nps_score: number | null;
  event_overall_rating: number | null;
  business_usefulness_rating: number | null;
  content_relevance_rating: number | null;
  speakers_rating: number | null;
  next_edition_likelihood: number | null;
  venue_rating: number | null;
  buffet_rating: number | null;
  
  // Bloco 4 - Feedback
  event_liked_most: string;
  improvement_priority: string;
}

const initialFormData: FormData = {
  gbc_member: null,
  participation_type: null,
  online_experience_rating: null,
  want_presential: null,
  will_organize_presential: null,
  online_liked: "",
  online_improve: "",
  presential_difference_rating: null,
  presential_experience_rating: null,
  connections_made: null,
  presential_liked: "",
  nps_score: null,
  event_overall_rating: null,
  business_usefulness_rating: null,
  content_relevance_rating: null,
  speakers_rating: null,
  next_edition_likelihood: null,
  venue_rating: null,
  buffet_rating: null,
  event_liked_most: "",
  improvement_priority: "",
};

export default function NpsGrifoTalk({ form }: NpsTemplateProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Determina quais blocos mostrar
  const isGbcMember = formData.gbc_member === "sim";
  const isOnline = formData.participation_type === "online";
  const isPresential = formData.participation_type === "presencial";
  const showVenueQuestions = isPresential || (!isGbcMember && formData.gbc_member === "nao");

  // Calcula os steps baseado nas respostas
  const getSteps = () => {
    const steps = ["profile"];
    
    if (isGbcMember) {
      if (isOnline) steps.push("online");
      if (isPresential) steps.push("presential");
    }
    
    steps.push("general");
    if (showVenueQuestions) steps.push("venue");
    steps.push("feedback");
    
    return steps;
  };

  const steps = getSteps();
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("nps_responses").insert({
        form_id: form.id,
        score: formData.nps_score || 0,
        feedback: JSON.stringify(formData),
      });
      if (error) throw error;
    },
    onSuccess: () => setIsSubmitted(true),
    onError: (error) => {
      console.error("Error submitting NPS:", error);
      toast.error("Erro ao enviar resposta. Tente novamente.");
    },
  });

  const canProceed = () => {
    const step = steps[currentStep];
    switch (step) {
      case "profile":
        if (formData.gbc_member === null) return false;
        if (formData.gbc_member === "sim" && formData.participation_type === null) return false;
        return true;
      case "online":
        return formData.online_experience_rating !== null;
      case "presential":
        return formData.presential_difference_rating !== null && formData.presential_experience_rating !== null;
      case "general":
        return formData.nps_score !== null && formData.event_overall_rating !== null;
      case "venue":
        return formData.venue_rating !== null;
      case "feedback":
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitMutation.mutate();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // Success screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#0A1C2F] flex items-center justify-center px-4">
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
          <p className="text-white/70 text-lg mb-4">
            Agradecemos muito por compartilhar sua experiência!
          </p>
          <p className="text-white/60 text-base">
            Seu feedback é essencial para que o Grifo Talks continue evoluindo e entregando cada vez mais valor. Esperamos te ver nas próximas edições!
          </p>
        </motion.div>
      </div>
    );
  }

  const renderStep = () => {
    const step = steps[currentStep];

    switch (step) {
      case "profile":
        return <ProfileStep formData={formData} setFormData={setFormData} />;
      case "online":
        return <OnlineStep formData={formData} setFormData={setFormData} />;
      case "presential":
        return <PresentialStep formData={formData} setFormData={setFormData} />;
      case "general":
        return <GeneralStep formData={formData} setFormData={setFormData} />;
      case "venue":
        return <VenueStep formData={formData} setFormData={setFormData} />;
      case "feedback":
        return <FeedbackStep formData={formData} setFormData={setFormData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1C2F] flex flex-col">
      {/* Header */}
      <div className="p-4 flex justify-center">
        <img src={grifoLogo} alt="Grifo" className="h-10" />
      </div>

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
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/10">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            <span className="text-white/50 text-sm">
              {currentStep + 1} de {totalSteps}
            </span>

            <Button
              onClick={handleNext}
              disabled={!canProceed() || submitMutation.isPending}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentStep === totalSteps - 1 ? (
                "Enviar"
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step Components
function ProfileStep({ formData, setFormData }: { formData: FormData; setFormData: React.Dispatch<React.SetStateAction<FormData>> }) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <p className="text-secondary text-sm font-medium mb-2 uppercase tracking-wider">
          Pesquisa NPS – Grifo Talks
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
          Perfil do Participante
        </h1>
        <p className="text-white/60 mt-4">
          Obrigado por participar do Grifo Talks! Sua opinião é fundamental para evoluirmos.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-white text-base">Você faz parte da comunidade GBC?</Label>
          <RadioGroup
            value={formData.gbc_member || ""}
            onValueChange={(v) => setFormData({ ...formData, gbc_member: v as GbcMember, participation_type: null })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sim" id="gbc-sim" className="border-white/30 text-secondary" />
              <Label htmlFor="gbc-sim" className="text-white/80 cursor-pointer">Sim</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="nao" id="gbc-nao" className="border-white/30 text-secondary" />
              <Label htmlFor="gbc-nao" className="text-white/80 cursor-pointer">Não</Label>
            </div>
          </RadioGroup>
        </div>

        {formData.gbc_member === "sim" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-3"
          >
            <Label className="text-white text-base">Como você participou desta edição?</Label>
            <RadioGroup
              value={formData.participation_type || ""}
              onValueChange={(v) => setFormData({ ...formData, participation_type: v as ParticipationType })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="part-online" className="border-white/30 text-secondary" />
                <Label htmlFor="part-online" className="text-white/80 cursor-pointer">Online</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="presencial" id="part-presencial" className="border-white/30 text-secondary" />
                <Label htmlFor="part-presencial" className="text-white/80 cursor-pointer">Presencial</Label>
              </div>
            </RadioGroup>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function OnlineStep({ formData, setFormData }: { formData: FormData; setFormData: React.Dispatch<React.SetStateAction<FormData>> }) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <p className="text-secondary text-sm font-medium mb-2 uppercase tracking-wider">
          Experiência Online
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          GBC Online
        </h1>
      </div>

      <div className="space-y-6">
        <ScaleQuestion
          label="Como você avalia a experiência de participar online?"
          value={formData.online_experience_rating}
          onChange={(v) => setFormData({ ...formData, online_experience_rating: v })}
          max={5}
        />

        <div className="space-y-3">
          <Label className="text-white text-base">Você ficou com vontade de participar presencialmente?</Label>
          <RadioGroup
            value={formData.want_presential || ""}
            onValueChange={(v) => setFormData({ ...formData, want_presential: v })}
            className="flex gap-4 flex-wrap"
          >
            {["Sim", "Talvez", "Não"].map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.toLowerCase()} id={`want-${opt}`} className="border-white/30 text-secondary" />
                <Label htmlFor={`want-${opt}`} className="text-white/80 cursor-pointer">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-white text-base">Você pretende se organizar para estar presencialmente nos próximos?</Label>
          <RadioGroup
            value={formData.will_organize_presential || ""}
            onValueChange={(v) => setFormData({ ...formData, will_organize_presential: v })}
            className="flex gap-4 flex-wrap"
          >
            {["Sim", "Talvez", "Não"].map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.toLowerCase()} id={`org-${opt}`} className="border-white/30 text-secondary" />
                <Label htmlFor={`org-${opt}`} className="text-white/80 cursor-pointer">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-white text-base">O que mais te agradou no formato online? (opcional)</Label>
          <Textarea
            value={formData.online_liked}
            onChange={(e) => setFormData({ ...formData, online_liked: e.target.value })}
            placeholder="Conte-nos..."
            className="min-h-[80px] bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-white text-base">O que pode melhorar na experiência online? (opcional)</Label>
          <Textarea
            value={formData.online_improve}
            onChange={(e) => setFormData({ ...formData, online_improve: e.target.value })}
            placeholder="Sua sugestão..."
            className="min-h-[80px] bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>
      </div>
    </div>
  );
}

function PresentialStep({ formData, setFormData }: { formData: FormData; setFormData: React.Dispatch<React.SetStateAction<FormData>> }) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <p className="text-secondary text-sm font-medium mb-2 uppercase tracking-wider">
          Experiência Presencial
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          GBC Presencial
        </h1>
      </div>

      <div className="space-y-6">
        <ScaleQuestion
          label="O quanto a experiência presencial fez diferença em comparação às online?"
          value={formData.presential_difference_rating}
          onChange={(v) => setFormData({ ...formData, presential_difference_rating: v })}
          max={5}
          leftLabel="Não fez diferença"
          rightLabel="Fez toda a diferença"
        />

        <ScaleQuestion
          label="Como você avalia a experiência presencial como um todo?"
          value={formData.presential_experience_rating}
          onChange={(v) => setFormData({ ...formData, presential_experience_rating: v })}
          max={5}
        />

        <div className="space-y-3">
          <Label className="text-white text-base">Você conseguiu fazer conexões relevantes durante o evento?</Label>
          <RadioGroup
            value={formData.connections_made || ""}
            onValueChange={(v) => setFormData({ ...formData, connections_made: v })}
            className="flex gap-3 flex-wrap"
          >
            {["Sim, muitas", "Algumas", "Poucas", "Nenhuma"].map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.toLowerCase()} id={`conn-${opt}`} className="border-white/30 text-secondary" />
                <Label htmlFor={`conn-${opt}`} className="text-white/80 cursor-pointer text-sm">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-white text-base">O que mais agregou para você na experiência presencial? (opcional)</Label>
          <Textarea
            value={formData.presential_liked}
            onChange={(e) => setFormData({ ...formData, presential_liked: e.target.value })}
            placeholder="Conte-nos..."
            className="min-h-[80px] bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>
      </div>
    </div>
  );
}

function GeneralStep({ formData, setFormData }: { formData: FormData; setFormData: React.Dispatch<React.SetStateAction<FormData>> }) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <p className="text-secondary text-sm font-medium mb-2 uppercase tracking-wider">
          Avaliação do Evento
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Avaliação Geral
        </h1>
      </div>

      <div className="space-y-6">
        <NpsQuestion
          label="De 0 a 10, o quanto você recomendaria o Grifo Talks para um amigo?"
          value={formData.nps_score}
          onChange={(v) => setFormData({ ...formData, nps_score: v })}
        />

        <ScaleQuestion
          label="Como você avalia o evento como um todo?"
          value={formData.event_overall_rating}
          onChange={(v) => setFormData({ ...formData, event_overall_rating: v })}
          max={5}
        />

        <ScaleQuestion
          label="O quanto o Grifo Talks foi útil para o seu momento atual de negócio?"
          value={formData.business_usefulness_rating}
          onChange={(v) => setFormData({ ...formData, business_usefulness_rating: v })}
          max={5}
        />

        <ScaleQuestion
          label="O quão relevante foi o conteúdo apresentado?"
          value={formData.content_relevance_rating}
          onChange={(v) => setFormData({ ...formData, content_relevance_rating: v })}
          max={5}
        />

        <ScaleQuestion
          label="Como você avalia os palestrantes/convidados?"
          value={formData.speakers_rating}
          onChange={(v) => setFormData({ ...formData, speakers_rating: v })}
          max={5}
        />

        <ScaleQuestion
          label="O quão provável é que você participe de uma próxima edição?"
          value={formData.next_edition_likelihood}
          onChange={(v) => setFormData({ ...formData, next_edition_likelihood: v })}
          max={5}
        />
      </div>
    </div>
  );
}

function VenueStep({ formData, setFormData }: { formData: FormData; setFormData: React.Dispatch<React.SetStateAction<FormData>> }) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <p className="text-secondary text-sm font-medium mb-2 uppercase tracking-wider">
          Experiência Presencial
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Local e Estrutura
        </h1>
      </div>

      <div className="space-y-6">
        <ScaleQuestion
          label="Como você avalia o local do evento?"
          value={formData.venue_rating}
          onChange={(v) => setFormData({ ...formData, venue_rating: v })}
          max={5}
        />

        <ScaleQuestion
          label="Como você avalia o buffet?"
          value={formData.buffet_rating}
          onChange={(v) => setFormData({ ...formData, buffet_rating: v })}
          max={5}
        />
      </div>
    </div>
  );
}

function FeedbackStep({ formData, setFormData }: { formData: FormData; setFormData: React.Dispatch<React.SetStateAction<FormData>> }) {
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <p className="text-secondary text-sm font-medium mb-2 uppercase tracking-wider">
          Feedback Final
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Suas Sugestões
        </h1>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-white text-base">O que você mais gostou no evento? (opcional)</Label>
          <Textarea
            value={formData.event_liked_most}
            onChange={(e) => setFormData({ ...formData, event_liked_most: e.target.value })}
            placeholder="Conte-nos o que mais te agradou..."
            className="min-h-[100px] bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-white text-base">
            Se pudéssemos melhorar apenas uma coisa para a próxima edição, o que deveria ser prioridade? (opcional)
          </Label>
          <Textarea
            value={formData.improvement_priority}
            onChange={(e) => setFormData({ ...formData, improvement_priority: e.target.value })}
            placeholder="Sua sugestão de melhoria..."
            className="min-h-[100px] bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>
      </div>
    </div>
  );
}

// Reusable Components
function ScaleQuestion({
  label,
  value,
  onChange,
  max = 5,
  leftLabel,
  rightLabel,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  max?: number;
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-white text-base">{label}</Label>
      <div className="flex gap-2 justify-center">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <motion.button
            key={n}
            onClick={() => onChange(n)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold transition-all",
              value === n
                ? "bg-secondary border-secondary text-secondary-foreground"
                : "bg-white/10 border-white/20 text-white hover:bg-white/20"
            )}
          >
            {n}
          </motion.button>
        ))}
      </div>
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-white/50 px-1">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

function NpsQuestion({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const getScoreColor = (v: number) => {
    if (v <= 6) return "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30";
    if (v <= 8) return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30";
    return "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30";
  };

  const getScoreSelectedColor = (v: number) => {
    if (v <= 6) return "bg-red-500 border-red-500 text-white";
    if (v <= 8) return "bg-yellow-500 border-yellow-500 text-white";
    return "bg-green-500 border-green-500 text-white";
  };

  return (
    <div className="space-y-3">
      <Label className="text-white text-base">{label}</Label>
      <div className="grid grid-cols-11 gap-1 md:gap-2">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <motion.button
            key={n}
            onClick={() => onChange(n)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "aspect-square rounded-lg border-2 flex items-center justify-center text-sm md:text-base font-bold transition-all",
              value === n ? getScoreSelectedColor(n) : getScoreColor(n)
            )}
          >
            {n}
          </motion.button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-white/50 px-1">
        <span>Nada provável</span>
        <span>Muito provável</span>
      </div>
    </div>
  );
}
