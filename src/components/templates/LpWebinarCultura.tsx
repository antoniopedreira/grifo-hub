import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Lock,
  CheckCircle,
  XCircle,
  Star,
  X,
  Flame,
} from "lucide-react";
import mentoresWebinar from "@/assets/mentores-webinar-cultura.jpg";
import danielGedeon from "@/assets/daniel-gedeon.jpg";
import rafaelSoares from "@/assets/rafael-soares.jpg";

interface LpWebinarCulturaProps {
  product: {
    id: string;
    name: string;
    checkout_url?: string | null;
  };
}

export function LpWebinarCultura({ product }: LpWebinarCulturaProps) {
  const ctaUrl = product.checkout_url || "#";
  const ctaUrlVip = product.checkout_url || "#";

  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [dismissedSticky, setDismissedSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const shouldShow = window.scrollY > 600;
      setShowStickyCTA(shouldShow && !dismissedSticky);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [dismissedSticky]);

  const scrollToPricing = () => {
    document.getElementById("pricing-section")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-[#001629] overflow-x-hidden">
      {/* Sticky CTA Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-sm border-b border-[#b8860b]/30 transition-all duration-500 ${
          showStickyCTA ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-[#b8860b] animate-pulse" />
            <span className="text-[#b8860b] font-bold text-sm uppercase tracking-wide">
              Vagas Limitadas
            </span>
            <span className="text-gray-300 text-sm hidden sm:inline">
              - Webinar ao vivo 22 de Janeiro às 19h30
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={scrollToPricing}
              className="bg-[#d4a017] hover:bg-[#b8860b] text-black font-bold text-sm px-6 py-2 uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#b8860b]/20"
            >
              Garantir Minha Vaga
            </Button>
            <button
              onClick={() => setDismissedSticky(true)}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section
        className="relative pt-4 pb-8 md:py-16 lg:py-24 px-3 sm:px-4"
        style={{
          background: "linear-gradient(rgba(0,22,41,0.85), rgba(0,22,41,0.85))",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-12 items-center">
            {/* Right Column - Image */}
            <div
              className="flex justify-center lg:justify-end animate-fade-in order-first lg:order-last"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="relative w-[70vw] sm:w-full max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto">
                <img 
                  src={mentoresWebinar} 
                  alt="Daniel Gedeon e Rafael Soares - Mentores do Webinar Cultura e Liderança" 
                  className="w-full rounded-xl lg:rounded-2xl shadow-2xl shadow-[#b8860b]/20 border border-[#b8860b]/30"
                />
              </div>
            </div>

            {/* Left Column - Text Content */}
            <div className="text-center lg:text-left min-w-0 w-full max-w-[92vw] sm:max-w-none mx-auto">
              <div className="inline-block max-w-full bg-[#b8860b]/20 border border-[#b8860b] text-[#b8860b] px-3 sm:px-6 py-2 rounded-full text-[10px] sm:text-sm font-bold uppercase tracking-wide mb-4 sm:mb-6 lg:mb-8 animate-fade-in hover:bg-[#b8860b]/30 transition-colors cursor-default whitespace-normal text-center">
                MASTERCLASS EXCLUSIVA POR TEMPO LIMITADO
              </div>

              <h1
                className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-4 sm:mb-6 uppercase italic animate-fade-in break-words"
                style={{ animationDelay: "0.1s" }}
              >
                <span className="text-[#b8860b]">
                  Sua equipe não engaja e não traz resultado?
                </span>{" "}
                A culpa não é da "mão de obra"
              </h1>

              <p
                className="text-gray-300 text-sm sm:text-base lg:text-lg leading-relaxed mb-6 sm:mb-8 animate-fade-in break-words"
                style={{ animationDelay: "0.2s" }}
              >
                É da falta de <strong className="text-white">CULTURA</strong> e{" "}
                <strong className="text-white">LIDERANÇA</strong>. Deixe de ser apenas um
                "tocador de obra" e torne-se um líder de verdade. Descubra como instalar a
                cultura que faz o time vestir a camisa e a empresa crescer sem você precisar
                vigiar
              </p>

              <Button
                onClick={scrollToPricing}
                disabled={!product.checkout_url}
                className="bg-[#d4a017] hover:bg-[#b8860b] text-black font-black text-xs sm:text-base lg:text-lg px-4 sm:px-10 lg:px-12 py-3 sm:py-5 lg:py-6 uppercase tracking-wide animate-fade-in transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#b8860b]/30 w-full sm:w-auto whitespace-normal h-auto leading-snug"
                style={{ animationDelay: "0.3s" }}
              >
                QUERO GARANTIR MEU ACESSO
              </Button>

              {!product.checkout_url && (
                <p className="mt-4 text-sm text-gray-500">
                  Link de checkout não configurado
                </p>
              )}

              {/* Benefits */}
              <div
                className="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-2 sm:gap-6 mt-6 sm:mt-8 animate-fade-in"
                style={{ animationDelay: "0.4s" }}
              >
                <div className="flex items-center justify-center lg:justify-start gap-2 text-green-400 hover:text-green-300 transition-colors cursor-default">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">Acesso Imediato</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="bg-gray-100 py-12 md:py-16 lg:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#001629] text-center mb-4 uppercase px-2">
            Você sente que está{" "}
            <span className="text-red-600">carregando a construtora</span> nas costas?
          </h2>

          <p className="text-center text-gray-600 text-sm sm:text-base lg:text-lg mb-8 sm:mb-12 max-w-2xl mx-auto px-2">
            A engenharia é técnica, mas o problema que tira o seu sono é{" "}
            <strong>humano</strong>. Você conhece esse cenário:
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg hover:shadow-red-100 transition-all duration-300 hover:-translate-y-1 group">
              <div className="flex items-start gap-4">
                <div className="bg-red-100 p-2 rounded-lg group-hover:bg-red-200 transition-colors">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#001629] mb-2 group-hover:text-red-700 transition-colors">
                    A Síndrome do "Tocador de Obra"
                  </h3>
                  <p className="text-gray-600">
                    Você passa o dia apagando incêndio no canteiro. Se você sai, a obra para
                    ou o ritmo cai.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg hover:shadow-red-100 transition-all duration-300 hover:-translate-y-1 group">
              <div className="flex items-start gap-4">
                <div className="bg-red-100 p-2 rounded-lg group-hover:bg-red-200 transition-colors">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#001629] mb-2 group-hover:text-red-700 transition-colors">
                    Equipe Desengajada
                  </h3>
                  <p className="text-gray-600">
                    Parece que ninguém se importa com o prazo ou com o desperdício de material
                    além de você.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg hover:shadow-red-100 transition-all duration-300 hover:-translate-y-1 group">
              <div className="flex items-start gap-4">
                <div className="bg-red-100 p-2 rounded-lg group-hover:bg-red-200 transition-colors">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#001629] mb-2 group-hover:text-red-700 transition-colors">
                    Comunicação Falha
                  </h3>
                  <p className="text-gray-600">
                    Você fala "A", eles entendem "B" e executam "C". O retrabalho come o seu
                    lucro.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg hover:shadow-red-100 transition-all duration-300 hover:-translate-y-1 group">
              <div className="flex items-start gap-4">
                <div className="bg-red-100 p-2 rounded-lg group-hover:bg-red-200 transition-colors">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#001629] mb-2 group-hover:text-red-700 transition-colors">
                    Sensação de Solidão
                  </h3>
                  <p className="text-gray-600">
                    Você sente que é o único remando o barco, enquanto a equipe está apenas
                    "batendo ponto".
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Truth Box */}
          <div className="bg-gray-200 p-8 rounded-xl text-center hover:bg-gray-250 transition-colors border-l-4 border-red-600">
            <p className="text-gray-600 text-lg mb-4">
              Você acha que o problema é que{" "}
              <em>"hoje em dia é difícil achar gente boa"</em>.
            </p>
            <p className="text-lg md:text-xl font-bold text-red-600">
              A verdade dura: O problema é que você tem a empresa, mas não tem as{" "}
              <span className="underline decoration-2 hover:text-red-700 transition-colors cursor-default">
                Estratégias de Liderança
              </span>{" "}
              nem as{" "}
              <span className="underline decoration-2 hover:text-red-700 transition-colors cursor-default">
                Ferramentas de Gestão
              </span>{" "}
              para fazer essa gente performar.
            </p>
          </div>

          <div className="mt-8 text-center">
            <Button
              onClick={scrollToPricing}
              className="bg-[#d4a017] hover:bg-[#b8860b] text-black font-black text-xs sm:text-base lg:text-lg px-8 sm:px-12 py-3 sm:py-5 lg:py-6 uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#b8860b]/30 w-full sm:w-auto"
            >
              QUERO GARANTIR MEU ACESSO
            </Button>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="bg-[#001629] py-12 md:py-16 lg:py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 uppercase italic px-2">
            Não é sobre <span className="text-[#b8860b]">mandar mais</span>.<br />É sobre{" "}
            <span className="text-[#b8860b]">liderar melhor</span>.
          </h2>

          <p className="text-gray-300 text-sm sm:text-base lg:text-lg max-w-3xl mx-auto mb-6 sm:mb-8 px-2">
            Unimos dois mundos para resolver esse gargalo. Nesta Masterclass Exclusiva, você
            terá acesso aos Processos de Cultura e Liderança que une a Visão de Negócio com a
            Realidade do Canteiro. Vamos abrir a caixa-preta de como transformar um grupo de
            funcionários em um <span className="text-[#b8860b]">Time de Elite</span>.
          </p>

          {/* Benefits Grid */}
          <div className="inline-block border border-gray-600 text-gray-400 px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm uppercase tracking-wide mb-8 sm:mb-12 hover:border-[#b8860b] hover:text-[#b8860b] transition-colors cursor-default">
            O que você vai dominar
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0a1f2e] p-6 rounded-xl text-left border border-transparent hover:border-[#b8860b]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#b8860b]/10 group">
              <div className="flex items-start gap-4">
                <div className="bg-[#b8860b]/20 p-2 rounded-full group-hover:bg-[#b8860b]/40 transition-colors">
                  <CheckCircle className="w-6 h-6 text-[#b8860b]" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-2 group-hover:text-[#b8860b] transition-colors">
                    Postura de Comando
                  </h3>
                  <p className="text-gray-400">
                    Como deixar de ser o chefe chato que grita e virar o líder que é respeitado.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0a1f2e] p-6 rounded-xl text-left border border-transparent hover:border-[#b8860b]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#b8860b]/10 group">
              <div className="flex items-start gap-4">
                <div className="bg-[#b8860b]/20 p-2 rounded-full group-hover:bg-[#b8860b]/40 transition-colors">
                  <CheckCircle className="w-6 h-6 text-[#b8860b]" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-2 group-hover:text-[#b8860b] transition-colors">
                    A Ferramenta de Engajamento
                  </h3>
                  <p className="text-gray-400">
                    Processos e KPIs para fazer o funcionário entender que o resultado dele move
                    o ponteiro da empresa.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0a1f2e] p-6 rounded-xl text-left border border-transparent hover:border-[#b8860b]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#b8860b]/10 group">
              <div className="flex items-start gap-4">
                <div className="bg-[#b8860b]/20 p-2 rounded-full group-hover:bg-[#b8860b]/40 transition-colors">
                  <CheckCircle className="w-6 h-6 text-[#b8860b]" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-2 group-hover:text-[#b8860b] transition-colors">
                    Delegação Real
                  </h3>
                  <p className="text-gray-400">
                    Como passar a tarefa garantindo que ela será feita, sem precisar virar babá
                    de marmanjo.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0a1f2e] p-6 rounded-xl text-left border border-transparent hover:border-[#b8860b]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#b8860b]/10 group">
              <div className="flex items-start gap-4">
                <div className="bg-[#b8860b]/20 p-2 rounded-full group-hover:bg-[#b8860b]/40 transition-colors">
                  <CheckCircle className="w-6 h-6 text-[#b8860b]" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-2 group-hover:text-[#b8860b] transition-colors">
                    Gestão de Conflitos
                  </h3>
                  <p className="text-gray-400">
                    Como resolver a "rádio peão" e as laranjas podres antes que contaminem a
                    obra.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button
              onClick={scrollToPricing}
              className="bg-[#d4a017] hover:bg-[#b8860b] text-black font-black text-xs sm:text-base lg:text-lg px-8 sm:px-12 py-3 sm:py-5 lg:py-6 uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#b8860b]/30 w-full sm:w-auto"
            >
              QUERO GARANTIR MEU ACESSO
            </Button>
          </div>
        </div>
      </section>

      {/* Mentors Section */}
      <section className="bg-[#0a1f2e] py-12 md:py-16 lg:py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block bg-[#b8860b] text-black px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wide mb-4 sm:mb-6 hover:bg-[#d4a017] transition-colors cursor-default">
            Seus Mentores
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-8 sm:mb-12 uppercase px-2">
            Quem vai te <span className="text-[#b8860b]">guiar</span> nessa jornada
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Daniel Gedeon - First */}
            <div className="bg-[#001629] p-8 rounded-2xl border border-gray-800 hover:border-[#b8860b]/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#b8860b]/10 group">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <img 
                  src={danielGedeon} 
                  alt="Daniel Gedeon" 
                  className="w-full h-full rounded-full object-cover border-4 border-[#b8860b] group-hover:border-[#d4a017] transition-colors group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute -bottom-2 -right-2 bg-[#b8860b] p-2 rounded-full group-hover:bg-[#d4a017] transition-colors">
                  <Star className="w-4 h-4 text-black" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#b8860b] uppercase mb-1 group-hover:text-[#d4a017] transition-colors">
                Daniel Gedeon
              </h3>
              <p className="text-gray-400 text-sm uppercase tracking-wide mb-4">
                Engenheiro Civil e Fundador da Grifo Engenharia
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">
                Daniel não construiu apenas obras, construiu um império de gestão. Começou com
                R$ 500 e escalou sua construtora através do Método Fast Construction.
              </p>
            </div>

            {/* Rafael Soares - Second */}
            <div className="bg-[#001629] p-8 rounded-2xl border border-gray-800 hover:border-[#b8860b]/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#b8860b]/10 group">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <img 
                  src={rafaelSoares} 
                  alt="Rafael Soares" 
                  className="w-full h-full rounded-full object-cover border-4 border-[#b8860b] group-hover:border-[#d4a017] transition-colors group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute -bottom-2 -right-2 bg-[#b8860b] p-2 rounded-full group-hover:bg-[#d4a017] transition-colors">
                  <Star className="w-4 h-4 text-black" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#b8860b] uppercase mb-1 group-hover:text-[#d4a017] transition-colors">
                Rafael Soares
              </h3>
              <p className="text-gray-400 text-sm uppercase tracking-wide mb-4">
                Engenheiro e Autoridade Nacional em Execução de Obras
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">
                Rafael vive a realidade da obra. Especialista em traduzir projetos complexos
                para a realidade do canteiro.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button
              onClick={scrollToPricing}
              className="bg-[#d4a017] hover:bg-[#b8860b] text-black font-black text-xs sm:text-base lg:text-lg px-8 sm:px-12 py-3 sm:py-5 lg:py-6 uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#b8860b]/30 w-full sm:w-auto"
            >
              QUERO GARANTIR MEU ACESSO
            </Button>
          </div>
        </div>
      </section>


      {/* Pricing Section */}
      <section id="pricing-section" className="bg-[#1a2a35] py-12 md:py-16 lg:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Column - Benefits */}
            <div className="text-left">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-6 italic">
                Aproveite o conteúdo em qualquer dispositivo.
              </h2>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#b8860b]/20 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-[#b8860b]" />
                  </div>
                  <span className="text-gray-300">Seus dados pessoais são confidenciais</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#b8860b]/20 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-[#b8860b]" />
                  </div>
                  <span className="text-gray-300">Compra 100% segura</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#b8860b]/20 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-[#b8860b]" />
                  </div>
                  <span className="text-gray-300">Garantia: seu dinheiro de volta sem perguntas</span>
                </div>
              </div>
            </div>

            {/* Right Column - Pricing Card */}
            <div className="bg-[#0d1820] rounded-2xl p-6 sm:p-8 relative border border-gray-700">
              {/* Promo Badge */}
              <div className="absolute -top-3 -right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase transform rotate-12">
                Promoção
              </div>

              {/* Limited Time Offer */}
              <div className="flex justify-center mb-4">
                <div className="bg-[#b8860b]/20 border border-[#b8860b] text-[#b8860b] px-4 py-2 rounded-full text-xs sm:text-sm font-bold uppercase flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  Oferta por Tempo Limitado
                </div>
              </div>

              {/* Price Display */}
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-1">de</p>
                <p className="text-gray-500 line-through text-xl mb-2">R$ 247,00</p>
                <p className="text-gray-400 text-sm mb-2">por apenas</p>
                <div className="text-5xl sm:text-6xl font-black text-[#b8860b] mb-3">
                  R$ 97<span className="text-2xl">,00</span>
                </div>

                {/* Savings Badge */}
                <div className="inline-block bg-green-600/20 border border-green-600 text-green-500 px-4 py-1 rounded-full text-sm font-bold mb-3">
                  Economia de R$ 150,00
                </div>

                <p className="text-gray-400 text-sm mb-6">ou 10x R$ 10,33</p>

                {/* CTA Button */}
                <Button
                  asChild
                  className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-black text-base sm:text-lg px-8 py-5 w-full uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/30"
                >
                  <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                    QUERO APROVEITAR
                  </a>
                </Button>

                {/* Security Notice */}
                <p className="text-gray-500 text-xs mt-4 uppercase tracking-wide">
                  Pagamento 100% Seguro com Acesso Imediato
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[#001629] py-12 md:py-16 lg:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-4 sm:mb-6">
            <div className="inline-block border border-[#b8860b] text-[#b8860b] px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wide hover:bg-[#b8860b]/10 transition-colors cursor-default">
              FAQ
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white text-center mb-8 sm:mb-12 uppercase px-2">
            Perguntas <span className="text-[#b8860b]">Frequentes</span>
          </h2>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="bg-[#0a1f2e] rounded-lg border border-[#1a3a52] px-6 hover:border-[#b8860b]/50 transition-colors data-[state=open]:border-[#b8860b]"
            >
              <AccordionTrigger className="text-white hover:text-[#b8860b] text-left font-medium py-6 transition-colors">
                Para quem é este evento?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-6">
                Este webinar é para donos de construtoras, engenheiros, mestres de obras e
                gestores que querem desenvolver habilidades de liderança e criar uma cultura de
                alta performance em suas equipes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="bg-[#0a1f2e] rounded-lg border border-[#1a3a52] px-6 hover:border-[#b8860b]/50 transition-colors data-[state=open]:border-[#b8860b]"
            >
              <AccordionTrigger className="text-white hover:text-[#b8860b] text-left font-medium py-6 transition-colors">
                Vai ficar gravado?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-6">
                Sim! A gravação ficará disponível por 1 ano após o evento ao vivo. (SOMENTE VIP)
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="bg-[#0a1f2e] rounded-lg border border-[#1a3a52] px-6 hover:border-[#b8860b]/50 transition-colors data-[state=open]:border-[#b8860b]"
            >
              <AccordionTrigger className="text-white hover:text-[#b8860b] text-left font-medium py-6 transition-colors">
                Serve para quem tem equipe pequena?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-6">
                Absolutamente! Os princípios de liderança e cultura funcionam independente do
                tamanho da equipe.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="bg-[#0a1f2e] rounded-lg border border-[#1a3a52] px-6 hover:border-[#b8860b]/50 transition-colors data-[state=open]:border-[#b8860b]"
            >
              <AccordionTrigger className="text-white hover:text-[#b8860b] text-left font-medium py-6 transition-colors">
                E se eu não puder assistir ao vivo?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-6">
                A gravação ficará disponível em até 24 horas após o evento. (SOMENTE VIP)
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-5"
              className="bg-[#0a1f2e] rounded-lg border border-[#1a3a52] px-6 hover:border-[#b8860b]/50 transition-colors data-[state=open]:border-[#b8860b]"
            >
              <AccordionTrigger className="text-white hover:text-[#b8860b] text-left font-medium py-6 transition-colors">
                Tem garantia?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-6">
                Sim! Você tem 7 dias de garantia incondicional. Devolvemos 100% do seu
                investimento.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A1F2E] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8">
            <div>
              <h3 className="text-[#b8860b] font-bold text-lg mb-1">GRIFO ACADEMY</h3>
              <p className="text-gray-500 text-sm">
                Transformando construtoras através de cultura e liderança
              </p>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-[#b8860b] transition-colors">
                Termos de Uso
              </a>
              <a href="#" className="hover:text-[#b8860b] transition-colors">
                Política de Privacidade
              </a>
              <a href="#" className="hover:text-[#b8860b] transition-colors">
                Contato
              </a>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Grifo Academy. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LpWebinarCultura;
