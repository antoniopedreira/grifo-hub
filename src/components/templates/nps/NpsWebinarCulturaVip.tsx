import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Star,
  MessageSquare,
  Target,
  Zap,
  Sparkles,
  Users,
  Award,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { NpsTemplateProps } from "./types";

type StepData = {
  email: string;
  nps_score: number | null;
  content_sense: string;
  practical_application: string;
  extra_hour_value: string;
  extra_hour_expectations: string;
  extra_hour_dynamics: string;
  learning_highlight: string;
  extra_hour_highlight: string;
  improvement_suggestion: string;
};

const INITIAL_DATA: StepData = {
  email: "",
  nps_score: null,
  content_sense: "",
  practical_application: "",
  extra_hour_value: "",
  extra_hour_expectations: "",
  extra_hour_dynamics: "",
  learning_highlight: "",
  extra_hour_highlight: "",
  improvement_suggestion: "",
};

export default function NpsWebinarCulturaVip({ form, productName }: NpsTemplateProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StepData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 300);
  }, [currentStep]);

  const totalSteps = 9;
  const progress = ((currentStep + 1) / (totalSteps + 1)) * 100;

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleChange = (field: keyof StepData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleScoreSelect = (value: number) => {
    handleChange("nps_score", value);
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 250);
  };

  const handleSelectAndNext = (field: keyof StepData, value: string) => {
    handleChange(field, value);
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 250);
  };

  const validateStep = () => {
    if (currentStep === 7 && formData.learning_highlight.trim().length < 3) {
      toast.error("Por favor, compartilhe o que foi mais valioso para você.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error: npsError } = await supabase.from("nps_responses").insert({
        form_id: form.id,
        score: formData.nps_score,
        feedback: JSON.stringify({
          email: formData.email || null,
          content_sense: formData.content_sense,
          practical_application: formData.practical_application,
          extra_hour_value: formData.extra_hour_value,
          extra_hour_expectations: formData.extra_hour_expectations,
          extra_hour_dynamics: formData.extra_hour_dynamics,
          learning_highlight: formData.learning_highlight,
          extra_hour_highlight: formData.extra_hour_highlight,
          improvement_suggestion: formData.improvement_suggestion,
        }),
      });

      if (npsError) throw npsError;

      toast.success("Resposta enviada com sucesso!");
      setCurrentStep(totalSteps + 1);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (currentStep === 7 || currentStep === 8) {
        handleNext();
      } else if (currentStep === 9) {
        handleSubmit();
      }
    }
  };

  const getScoreColor = (value: number, isSelected: boolean) => {
    if (isSelected) {
      if (value <= 6) return "bg-red-500 border-red-500 text-white";
      if (value <= 8) return "bg-yellow-500 border-yellow-500 text-white";
      return "bg-green-500 border-green-500 text-white";
    }
    if (value <= 6) return "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30";
    if (value <= 8) return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30";
    return "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30";
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#112232] text-[#E1D8CF] font-sans relative overflow-hidden p-4">
      {/* PROGRESS BAR */}
      <div className="absolute top-0 left-0 w-full h-2 bg-[#112232] z-50">
        <div className="h-full bg-[#A47428] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="w-full max-w-2xl z-10 flex flex-col items-center">
        {/* HEADER */}
        <div className="mb-8 md:mb-12 transition-opacity duration-500 text-center">
          <img
            src="https://naroalxhbrvmosbqzhrb.supabase.co/storage/v1/object/public/photos-wallpapers/LOGO_GRIFO_6-removebg-preview.png"
            alt="Grifo Logo"
            className="h-16 md:h-24 w-auto object-contain drop-shadow-2xl mx-auto mb-6"
          />
          {currentStep === 0 && (
            <div className="animate-in fade-in duration-500">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
                Pesquisa de Satisfação
              </h1>
              <p className="text-[#A47428] font-medium">
                {productName || "Cultura e Liderança de Alta Performance no Canteiro de Obra"}
              </p>
              <p className="text-[#E1D8CF]/60 mt-4 max-w-md mx-auto text-sm md:text-base">
                Sua opinião é importante pra gente porque é ela que mostra o que funciona na prática e o que precisa evoluir.
              </p>
            </div>
          )}
        </div>

        {/* CONTENT AREA */}
        <div className="w-full relative min-h-[400px]">
          {/* STEP 0: NPS SCORE + EMAIL OPCIONAL */}
          {currentStep === 0 && (
            <QuestionCard
              number={1}
              question="Em uma escala de 0 a 10, o quanto você indicaria este webinar para um colega que atua em obra ou liderança?"
              subtext="0 = não indicaria | 10 = indicaria com certeza"
            >
              <div className="mb-6">
                <label className="block text-sm text-[#E1D8CF]/60 mb-2">
                  Seu e-mail (opcional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-transparent border-2 border-[#E1D8CF]/20 text-[#E1D8CF] text-lg p-3 rounded-lg focus:ring-0 focus:outline-none focus:border-[#A47428] transition-all placeholder:text-[#E1D8CF]/30"
                />
              </div>
              <div className="grid grid-cols-11 gap-1 md:gap-2 mt-4">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleScoreSelect(value)}
                    className={cn(
                      "aspect-square rounded-lg border-2 flex items-center justify-center",
                      "text-sm md:text-lg font-bold transition-all duration-200 hover:scale-110",
                      getScoreColor(value, formData.nps_score === value)
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 1: SENTIDO DO CONTEÚDO */}
          {currentStep === 1 && (
            <QuestionCard
              number={2}
              question="O conteúdo apresentado fez sentido para a sua realidade de obra e liderança?"
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  "Fez total sentido",
                  "Fez bastante sentido",
                  "Fez sentido em partes",
                  "Fez pouco sentido",
                  "Não fez sentido",
                ].map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    selected={formData.content_sense === option}
                    onClick={() => handleSelectAndNext("content_sense", option)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 2: APLICAÇÃO PRÁTICA */}
          {currentStep === 2 && (
            <QuestionCard
              number={3}
              question="A forma como o conteúdo foi conduzido facilitou a aplicação prática no dia a dia?"
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  "Sim, totalmente",
                  "Em grande parte",
                  "Parcialmente",
                  "Pouco",
                  "Não",
                ].map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    selected={formData.practical_application === option}
                    onClick={() => handleSelectAndNext("practical_application", option)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 3: VALOR 1H EXTRA */}
          {currentStep === 3 && (
            <QuestionCard
              number={4}
              question="A 1h extra no Google Meet com Daniel e Rafael agregou valor à sua experiência?"
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  "Agregou muito valor",
                  "Agregou valor",
                  "Agregou pouco valor",
                  "Não agregou valor",
                  "Não participei",
                ].map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    selected={formData.extra_hour_value === option}
                    onClick={() => handleSelectAndNext("extra_hour_value", option)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 4: EXPECTATIVAS 1H EXTRA */}
          {currentStep === 4 && (
            <QuestionCard
              number={5}
              question="O nível de aprofundamento da 1h extra atendeu às suas expectativas?"
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  "Superou as expectativas",
                  "Atendeu totalmente",
                  "Atendeu parcialmente",
                  "Ficou abaixo do esperado",
                  "Não participei",
                ].map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    selected={formData.extra_hour_expectations === option}
                    onClick={() => handleSelectAndNext("extra_hour_expectations", option)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 5: DINÂMICA 1H EXTRA */}
          {currentStep === 5 && (
            <QuestionCard
              number={6}
              question="Como você avalia a dinâmica de perguntas, respostas e troca durante a 1h extra?"
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  "Muito boa",
                  "Boa",
                  "Regular",
                  "Ruim",
                  "Não participei",
                ].map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    selected={formData.extra_hour_dynamics === option}
                    onClick={() => handleSelectAndNext("extra_hour_dynamics", option)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 6: APRENDIZADO MAIS VALIOSO */}
          {currentStep === 6 && (
            <QuestionCard
              number={7}
              question="O que você acha que foi mais valioso de aprendizado nesse webinar?"
            >
              <TextAreaInput
                ref={inputRef}
                value={formData.learning_highlight}
                onChange={(e) => handleChange("learning_highlight", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Compartilhe o que mais agregou valor para você..."
              />
            </QuestionCard>
          )}

          {/* STEP 7: DESTAQUE 1H EXTRA */}
          {currentStep === 7 && (
            <QuestionCard
              number={8}
              question="O que mais fez diferença para você na 1h extra com Daniel e Rafael?"
              subtext="(Opcional)"
            >
              <TextAreaInput
                ref={inputRef}
                value={formData.extra_hour_highlight}
                onChange={(e) => handleChange("extra_hour_highlight", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Conte o que mais marcou você nesse momento..."
              />
            </QuestionCard>
          )}

          {/* STEP 8: SUGESTÃO DE MELHORIA */}
          {currentStep === 8 && (
            <QuestionCard
              number={9}
              question="O que poderia tornar essa experiência ainda melhor para você?"
              subtext="(Opcional)"
            >
              <TextAreaInput
                ref={inputRef}
                value={formData.improvement_suggestion}
                onChange={(e) => handleChange("improvement_suggestion", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Conte-nos suas sugestões de melhoria..."
              />

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full mt-6 flex items-center justify-center bg-[#A47428] hover:bg-[#8a6120] text-white px-6 py-4 rounded-lg font-bold transition-all shadow-lg shadow-[#A47428]/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" /> Enviando...
                  </>
                ) : (
                  <>
                    Enviar Resposta <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>
            </QuestionCard>
          )}

          {/* TELA DE SUCESSO */}
          {currentStep > 8 && (
            <div className="flex flex-col items-center justify-center animate-in fade-in duration-700 text-center mt-10">
              <div className="w-20 h-20 rounded-full bg-[#A47428] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(164,116,40,0.4)]">
                <Check className="text-white w-10 h-10" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Obrigado!</h2>
              <p className="text-[#E1D8CF]/80 text-lg max-w-md">
                Sua opinião foi registrada com sucesso. Agradecemos por dedicar seu tempo para nos ajudar a melhorar!
              </p>
            </div>
          )}
        </div>

        {/* NAVIGATION CONTROLS */}
        {currentStep > 0 && currentStep <= 8 && (
          <div className="fixed bottom-0 left-0 w-full p-6 bg-[#112232] md:bg-transparent md:static flex items-center justify-between max-w-2xl mt-8">
            <button
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center text-[#E1D8CF]/60 hover:text-[#A47428] transition-colors font-medium text-sm md:text-base disabled:opacity-50"
            >
              <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
            </button>

            {currentStep === 7 && (
              <button
                onClick={handleNext}
                className="flex items-center bg-[#A47428] hover:bg-[#8a6120] text-white px-6 py-3 rounded-lg font-bold transition-all ml-auto shadow-lg shadow-[#A47428]/20"
              >
                Continuar <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTES ---

function QuestionCard({ children, number, question, subtext }: {
  children: React.ReactNode;
  number: number;
  question: string;
  subtext?: string;
}) {
  return (
    <div className="flex flex-col items-start w-full animate-in slide-in-from-right-8 duration-500 fade-in">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[#A47428] font-bold text-sm tracking-widest uppercase">Questão {number}</span>
      </div>

      <h2 className="text-xl md:text-2xl font-bold text-white mb-3 leading-tight">{question}</h2>

      {subtext && <p className="text-[#E1D8CF]/60 text-base mb-6">{subtext}</p>}

      <div className="w-full">{children}</div>
    </div>
  );
}

const TextAreaInput = ({ value, onChange, placeholder, onKeyDown, ref }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  onKeyDown: (e: React.KeyboardEvent) => void;
  ref?: React.Ref<HTMLTextAreaElement>;
}) => (
  <textarea
    ref={ref}
    value={value}
    onChange={onChange}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    rows={4}
    className="w-full bg-transparent border-2 border-[#E1D8CF]/20 text-[#E1D8CF] text-lg p-4 rounded-lg focus:ring-0 focus:outline-none focus:border-[#A47428] transition-all placeholder:text-[#E1D8CF]/30 resize-none"
  />
);

const OptionButton = ({ label, selected, onClick }: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full text-left p-4 md:p-5 rounded-lg border text-lg transition-all duration-200 flex items-center justify-between group",
      selected
        ? "bg-[#A47428] border-[#A47428] text-white shadow-lg shadow-[#A47428]/25"
        : "bg-transparent border-[#E1D8CF]/20 text-[#E1D8CF] hover:border-[#A47428] hover:bg-[#A47428]/10"
    )}
  >
    <span className="font-medium">{label}</span>
    {selected && <Check className="w-5 h-5" />}
    {!selected && <div className="w-5 h-5 rounded-full border border-[#E1D8CF]/40 group-hover:border-[#A47428]" />}
  </button>
);
