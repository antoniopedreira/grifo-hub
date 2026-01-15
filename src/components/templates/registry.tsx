import { lazy, ComponentType } from "react";

export interface TemplateComponentProps {
  product: {
    id: string;
    name: string;
    checkout_url?: string | null;
  };
}

// Lazy load template components for better performance
const FormHighTicket = lazy(() => import("./FormHighTicket"));
const FormBasic = lazy(() => import("./FormBasic"));

// LpStandard é um named export, então usamos o .then para extrair
const LpStandard = lazy(() => import("./LpStandard").then((m) => ({ default: m.LpStandard })));

// ADICIONADO: FormConstruction
// Note o adaptador: o sistema manda 'product', mas o componente quer 'productId'
const FormConstruction = lazy(() =>
  import("./FormConstruction").then((m) => ({
    default: (props: TemplateComponentProps) => (
      <m.FormConstruction
        productId={props.product.id}
        // Se precisar passar onSubmitSuccess, passaria aqui, mas o renderizador padrão talvez não mande
      />
    ),
  })),
);

// Registry mapping component_key strings to React components
export const templateRegistry: Record<string, ComponentType<TemplateComponentProps>> = {
  form_high_ticket: FormHighTicket,
  form_basic: FormBasic,
  lp_standard: LpStandard,
  form_construction: FormConstruction, // <--- Nova chave registrada
};

export function getTemplateComponent(componentKey: string): ComponentType<TemplateComponentProps> | null {
  return templateRegistry[componentKey] || null;
}
