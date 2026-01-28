import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Building2,
  User,
  Phone,
  Mail,
  Briefcase,
  HardHat,
  DollarSign,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CountryCodeSelect } from "@/components/ui/country-code-select";

interface FormConstructionProps {
  productId?: string;
  onSubmitSuccess?: () => void;
}

type StepData = {
  full_name: string;
  phone: string;
  countryCode: string;
  email: string;
  company_name: string;
  role: string;
  niche: string;
  revenue: string;
  investment: string;
};

const INITIAL_DATA: StepData = {
  full_name: "",
  phone: "",
  countryCode: "+55",
  email: "",
  company_name: "",
  role: "",
  niche: "",
  revenue: "",
  investment: "",
};

export function FormConstruction({ productId, onSubmitSuccess }: FormConstructionProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StepData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // --- INJEÇÃO DO PIXEL DO META ADS ---
  useEffect(() => {
    if (!productId) return;

    const initMetaPixel = async () => {
      try {
        // Usamos 'as any' aqui temporariamente para driblar o erro de tipagem
        // já que a coluna foi criada via SQL mas os tipos locais não foram regenerados via CLI
        const { data } = await supabase
          .from("products")
          .select("meta_pixel_id" as any)
          .eq("id", productId)
          .single();

        // @ts-ignore
        const pixelId = data?.meta_pixel_id;

        if (pixelId) {
          if (!document.getElementById(`pixel-${pixelId}`)) {
            console.log(`Inicializando Pixel do Facebook: ${pixelId}`);

            const script = document.createElement("script");
            script.id = `pixel-${pixelId}`;
            script.innerHTML = `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              
              fbq('init', '${pixelId}'); 
              fbq('track', 'PageView');
            `;
            document.head.appendChild(script);

            const noscript = document.createElement("noscript");
            noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`;
            document.head.appendChild(noscript);
          } else {
            // @ts-ignore
            if (window.fbq) window.fbq("track", "PageView");
          }
        }
      } catch (error) {
        console.error("Erro ao carregar Pixel:", error);
      }
    };

    initMetaPixel();
  }, [productId]);
  // --- FIM DA INTEGRAÇÃO PIXEL ---

  useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 300);
  }, [currentStep]);

  const totalSteps = 8;
  const progress = ((currentStep + 1) / (totalSteps + 1)) * 100;

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleChange = (field: keyof StepData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectAndNext = (field: keyof StepData, value: string) => {
    handleChange(field, value);
    setTimeout(() => {
      if (field === "investment") {
        handleSubmit(value);
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }, 250);
  };

  const validateStep = () => {
    if (currentStep === 0 && formData.full_name.length < 3) {
      toast.error("Por favor, digite seu nome completo.");
      return false;
    }
    if (currentStep === 1 && formData.phone.replace(/\D/g, "").length < 10) {
      toast.error("Telefone inválido.");
      return false;
    }
    if (currentStep === 2 && !formData.email.includes("@")) {
      toast.error("Email inválido.");
      return false;
    }
    if (currentStep === 3 && formData.company_name.length < 2) {
      toast.error("Nome da empresa é obrigatório.");
      return false;
    }
    return true;
  };

  const mapRevenueToNumber = (revenue: string): number | null => {
    if (!revenue) return null;
    const mapping: Record<string, number> = {
      "<500k": 0,
      "500k-1M": 500000,
      "1M-5M": 1000000,
      "5M-10M": 5000000,
      "10M-50M": 10000000,
      "+50M": 50000000,
    };
    return mapping[revenue] ?? null;
  };

  const handleSubmit = async (finalValue?: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalData = { ...formData, investment: finalValue || formData.investment };
      const fullPhone = `${finalData.countryCode}${finalData.phone.replace(/\D/g, "")}`;
      const companyRevenue = mapRevenueToNumber(finalData.revenue);

      // 1. Criar ou atualizar Lead
      const { data: existingLead } = await supabase.from("leads").select("id").eq("email", finalData.email).single();

      let lead: { id: string };

      if (existingLead) {
        const updateData: Record<string, unknown> = {
          full_name: finalData.full_name,
          phone: fullPhone,
        };
        if (companyRevenue !== null) {
          updateData.company_revenue = companyRevenue;
        }
        await supabase.from("leads").update(updateData).eq("id", existingLead.id);
        lead = existingLead;
      } else {
        let leadOrigin: string | null = null;
        if (productId) {
          const { data: productConfig } = await supabase
            .from("products")
            .select("lead_origin, name")
            .eq("id", productId)
            .single();
          leadOrigin = productConfig?.lead_origin || productConfig?.name || null;
        }

        const insertData: Record<string, unknown> = {
          full_name: finalData.full_name,
          email: finalData.email,
          phone: fullPhone,
          status: "Novo",
          origin: leadOrigin,
        };
        if (companyRevenue !== null) {
          insertData.company_revenue = companyRevenue;
        }
        const { data: newLead, error: leadError } = await supabase.from("leads").insert(insertData).select().single();
        if (leadError) throw leadError;
        lead = newLead;
      }

      // 2. Salvar Respostas
      const { error: subError } = await supabase.from("form_submissions").insert({
        lead_id: lead.id,
        product_id: productId,
        answers: {
          role: finalData.role,
          company: finalData.company_name,
          niche: finalData.niche,
          revenue: finalData.revenue,
          investment_commitment: finalData.investment,
        },
      });

      if (subError) throw subError;

      // 3. Criar Deal
      if (productId) {
        const { data: productConfig } = await supabase
          .from("products")
          .select("create_deal, pipeline_id, price")
          .eq("id", productId)
          .single();

        if (productConfig?.create_deal && productConfig?.pipeline_id) {
          const { data: stages } = await supabase
            .from("pipeline_stages")
            .select("id")
            .eq("pipeline_id", productConfig.pipeline_id)
            .order("order_index", { ascending: true })
            .limit(1);

          if (stages && stages.length > 0) {
            await supabase.from("deals").insert({
              lead_id: lead.id,
              product_id: productId,
              pipeline_id: productConfig.pipeline_id,
              stage_id: stages[0].id,
              status: "open",
              value: productConfig.price || 0,
              priority: "Medium",
            });
          }
        }
      }

      toast.success("Aplicação enviada com sucesso!");
      if (onSubmitSuccess) onSubmitSuccess();
      setCurrentStep(totalSteps + 1);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if ([0, 1, 2, 3].includes(currentStep)) {
        handleNext();
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#112232] text-[#E1D8CF] font-sans relative overflow-hidden p-4">
      <div className="absolute top-0 left-0 w-full h-2 bg-[#112232] z-50">
        <div className="h-full bg-[#A47428] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="w-full max-w-2xl z-10 flex flex-col items-center">
        <div className="mb-8 md:mb-12 transition-opacity duration-500">
          <img
            src="https://naroalxhbrvmosbqzhrb.supabase.co/storage/v1/object/public/photos-wallpapers/LOGO_GRIFO_6-removebg-preview.png"
            alt="Grifo Logo"
            className="h-16 md:h-24 w-auto object-contain drop-shadow-2xl"
          />
        </div>

        <div className="w-full relative min-h-[400px]">
          {currentStep === 0 && (
            <QuestionCard
              icon={<User className="text-[#A47428]" size={32} />}
              number={1}
              question="Para começarmos, qual é o seu nome completo?"
              subtext="Queremos saber quem está falando conosco."
            >
              <InputLine
                ref={inputRef}
                name="name"
                autoComplete="name"
                value={formData.full_name}
                onChange={(e: any) => handleChange("full_name", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite seu nome..."
              />
            </QuestionCard>
          )}

          {currentStep === 1 && (
            <QuestionCard
              icon={<Phone className="text-[#A47428]" size={32} />}
              number={2}
              question="Qual seu WhatsApp para contato?"
              subtext="Nossos especialistas entrarão em contato por aqui."
            >
              <div className="flex items-end gap-3">
                <CountryCodeSelect
                  value={formData.countryCode}
                  onChange={(dialCode) => handleChange("countryCode", dialCode)}
                  variant="dark"
                  className="flex-shrink-0"
                />
                <div className="flex-1">
                  <InputLine
                    ref={inputRef}
                    name="tel"
                    autoComplete="tel-national"
                    value={formData.phone}
                    onChange={(e: any) => {
                      let val = e.target.value.replace(/^\+\d{1,3}\s?/, "");
                      handleChange("phone", val);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="(00) 00000-0000"
                    type="tel"
                  />
                </div>
              </div>
            </QuestionCard>
          )}

          {currentStep === 2 && (
            <QuestionCard
              icon={<Mail className="text-[#A47428]" size={32} />}
              number={3}
              question="E o seu melhor e-mail corporativo?"
              subtext="Para envio de materiais e propostas oficiais."
            >
              <InputLine
                ref={inputRef}
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e: any) => handleChange("email", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="seu@empresa.com.br"
                type="email"
              />
            </QuestionCard>
          )}

          {currentStep === 3 && (
            <QuestionCard
              icon={<Building2 className="text-[#A47428]" size={32} />}
              number={4}
              question="Qual nome da sua empresa?"
              subtext="Identifique a organização que você representa."
            >
              <InputLine
                ref={inputRef}
                name="organization"
                autoComplete="organization"
                value={formData.company_name}
                onChange={(e: any) => handleChange("company_name", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nome da empresa"
              />
            </QuestionCard>
          )}

          {currentStep === 4 && (
            <QuestionCard
              icon={<Briefcase className="text-[#A47428]" size={32} />}
              number={5}
              question="Qual seu cargo atual na empresa?"
              subtext="Selecione a opção que melhor se adequa."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {[
                  "Sócio / Proprietário",
                  "Diretor de Obras",
                  "Engenheiro Chefe",
                  "Arquiteto Coordenador",
                  "Suprimentos / Compras",
                  "Outro",
                ].map((role) => (
                  <OptionButton
                    key={role}
                    label={role}
                    selected={formData.role === role}
                    onClick={() => handleSelectAndNext("role", role)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {currentStep === 5 && (
            <QuestionCard
              icon={<HardHat className="text-[#A47428]" size={32} />}
              number={6}
              question="Qual a principal área de atuação?"
              subtext="Entender seu nicho nos ajuda a ser mais assertivos."
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  "Incorporação Residencial",
                  "Obras Comerciais e Corporativas",
                  "Galpões e Obras Industriais",
                  "Reformas de Alto Padrão",
                  "Infraestrutura e Loteamentos",
                  "Obras Públicas / Licitações",
                ].map((niche) => (
                  <OptionButton
                    key={niche}
                    label={niche}
                    selected={formData.niche === niche}
                    onClick={() => handleSelectAndNext("niche", niche)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {currentStep === 6 && (
            <QuestionCard
              icon={<DollarSign className="text-[#A47428]" size={32} />}
              number={7}
              question="Qual o faturamento atual da empresa?"
              subtext="Essa informação é confidencial e usada apenas para qualificação."
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  { value: "<500k", label: "Até R$ 500 mil" },
                  { value: "500k-1M", label: "Entre R$ 500 mil e R$ 1 mi" },
                  { value: "1M-5M", label: "Entre R$ 1 mi e R$ 5 mi" },
                  { value: "5M-10M", label: "Entre R$ 5 mi e R$ 10 mi" },
                  { value: "10M-50M", label: "Entre R$ 10 mi e R$ 50 mi" },
                  { value: "+50M", label: "Acima de R$ 50 mi" },
                ].map((option) => (
                  <OptionButton
                    key={option.value}
                    label={option.label}
                    selected={formData.revenue === option.value}
                    onClick={() => handleSelectAndNext("revenue", option.value)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {currentStep === 7 && (
            <QuestionCard
              icon={<Wallet className="text-[#A47428]" size={32} />}
              number={8}
              question="Investimento Necessário"
              subtext="O investimento para adquirir e participar dos nossos produtos é de R$2.000,00 a R$25.000,00. Para agilizar a análise da sua aplicação, preencha os dados abaixo:"
            >
              <div className="mb-6 text-xl md:text-2xl font-bold text-white leading-relaxed">
                Você tem interesse em continuar com o processo seletivo?
              </div>

              <div className="grid grid-cols-1 gap-3 mt-4">
                <OptionButton
                  label="Tenho interesse, mas busco opções de parcelamento."
                  selected={false}
                  onClick={() => handleSelectAndNext("investment", "Tenho interesse, parcelamento")}
                />
                <OptionButton
                  label="Preciso de mais detalhes antes de decidir."
                  selected={false}
                  onClick={() => handleSelectAndNext("investment", "Preciso de mais detalhes")}
                />
                <OptionButton
                  label="Pretendo realizar o pagamento à vista."
                  selected={false}
                  onClick={() => handleSelectAndNext("investment", "Tenho interesse, à vista")}
                />
              </div>

              {isSubmitting && (
                <div className="mt-4 flex items-center justify-center text-[#A47428]">
                  <Loader2 className="animate-spin mr-2" /> Enviando aplicação...
                </div>
              )}
            </QuestionCard>
          )}

          {currentStep > 7 && (
            <div className="flex flex-col items-center justify-center animate-in fade-in duration-700 text-center mt-10">
              <div className="w-20 h-20 rounded-full bg-[#A47428] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(164,116,40,0.4)]">
                <Check className="text-white w-10 h-10" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Aplicação Recebida!</h2>
              <p className="text-[#E1D8CF]/80 text-lg max-w-md">
                Nossa equipe de especialistas irá analisar o perfil da {formData.company_name} e entrará em contato via
                WhatsApp em breve.
              </p>
            </div>
          )}
        </div>

        {currentStep <= 7 && (
          <div className="fixed bottom-0 left-0 w-full p-6 bg-[#112232] md:bg-transparent md:static flex items-center justify-between max-w-2xl mt-8">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center text-[#E1D8CF]/60 hover:text-[#A47428] transition-colors font-medium text-sm md:text-base disabled:opacity-50"
              >
                <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
              </button>
            )}

            {[0, 1, 2, 3].includes(currentStep) && (
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

function QuestionCard({ children, icon, number, question, subtext }: any) {
  return (
    <div className="flex flex-col items-start w-full animate-in slide-in-from-right-8 duration-500 fade-in">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[#A47428] font-bold text-sm tracking-widest uppercase">Questão {number}</span>
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">{question}</h2>

      {subtext && <p className="text-[#E1D8CF]/60 text-lg mb-8">{subtext}</p>}

      <div className="w-full">{children}</div>
    </div>
  );
}

const InputLine = ({ value, onChange, placeholder, type = "text", onKeyDown, ref, autoComplete = "on", name }: any) => (
  <div className="relative w-full">
    <style>
      {`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active{
            -webkit-box-shadow: 0 0 0 30px #112232 inset !important;
            -webkit-text-fill-color: #E1D8CF !important;
            transition: background-color 5000s ease-in-out 0s;
        }
      `}
    </style>
    <input
      ref={ref}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      spellCheck="false"
      autoComplete={autoComplete}
      className="w-full bg-transparent border-0 border-b-2 border-[#E1D8CF]/20 text-[#E1D8CF] text-2xl md:text-3xl py-4 focus:ring-0 focus:outline-none focus:border-[#A47428] transition-all placeholder:text-[#E1D8CF]/30 appearance-none rounded-none"
    />
  </div>
);

const OptionButton = ({ label, selected, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full text-left p-4 md:p-5 rounded-lg border text-lg transition-all duration-200 flex items-center justify-between group",
      selected
        ? "bg-[#A47428] border-[#A47428] text-white shadow-lg shadow-[#A47428]/25"
        : "bg-transparent border-[#E1D8CF]/20 text-[#E1D8CF] hover:border-[#A47428] hover:bg-[#A47428]/10",
    )}
  >
    <span className="font-medium">{label}</span>
    {selected && <Check className="w-5 h-5" />}
    {!selected && <div className="w-5 h-5 rounded-full border border-[#E1D8CF]/40 group-hover:border-[#A47428]" />}
  </button>
);
