import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Star } from "lucide-react";

interface LpStandardProps {
  product: {
    id: string;
    name: string;
    checkout_url?: string | null;
  };
}

export function LpStandard({ product }: LpStandardProps) {
  const handleCTAClick = () => {
    if (product.checkout_url) {
      window.open(product.checkout_url, "_blank");
    }
  };

  const benefits = [
    "Aumente sua produtividade em até 3x",
    "Método comprovado por milhares de alunos",
    "Suporte exclusivo e comunidade ativa",
    "Garantia incondicional de 7 dias",
  ];

  const testimonials = [
    {
      name: "Carlos Silva",
      role: "Empresário",
      text: "Transformou completamente meu negócio. Resultados em menos de 30 dias!",
    },
    {
      name: "Ana Martins",
      role: "Consultora",
      text: "O melhor investimento que fiz na minha carreira profissional.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-primary text-primary-foreground py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1 mb-6 text-sm font-medium bg-secondary text-secondary-foreground rounded-full">
            Oferta por tempo limitado
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Transforme Seus Resultados Com Nosso Método Exclusivo
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-foreground/80">
            Descubra como centenas de profissionais estão alcançando resultados extraordinários
          </p>
          <Button
            onClick={handleCTAClick}
            disabled={!product.checkout_url}
            size="lg"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-lg px-8 py-6 h-auto"
          >
            Quero Começar Agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          {!product.checkout_url && (
            <p className="mt-4 text-sm text-primary-foreground/60">
              Link de checkout não configurado
            </p>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-primary">
            Por que escolher nosso método?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-6 bg-background rounded-lg border border-tertiary shadow-sm"
              >
                <CheckCircle className="h-6 w-6 text-secondary shrink-0 mt-0.5" />
                <p className="text-lg text-foreground">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-primary">
            O que nossos clientes dizem
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-6 bg-muted/30 rounded-lg border border-tertiary"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="text-foreground mb-4 italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold text-primary">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para transformar seus resultados?
          </h2>
          <p className="text-xl mb-8 text-primary-foreground/80">
            Não perca mais tempo. Comece sua jornada de sucesso hoje mesmo.
          </p>
          <Button
            onClick={handleCTAClick}
            disabled={!product.checkout_url}
            size="lg"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-lg px-8 py-6 h-auto"
          >
            Garantir Minha Vaga Agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-background border-t border-tertiary">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
