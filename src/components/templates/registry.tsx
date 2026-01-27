import { lazy, ComponentType } from "react";
import { NpsTemplateProps } from "./nps/types";

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

// FormConstruction - adaptador: o sistema manda 'product', mas o componente quer 'productId'
const FormConstruction = lazy(() =>
  import("./FormConstruction").then((m) => ({
    default: (props: TemplateComponentProps) => (
      <m.FormConstruction
        productId={props.product.id}
      />
    ),
  })),
);

// FormGrifoTalk - Formulário de confirmação de presença para evento
const FormGrifoTalk = lazy(() =>
  import("./FormGrifoTalk").then((m) => ({
    default: (props: TemplateComponentProps) => (
      <m.default
        productId={props.product.id}
      />
    ),
  })),
);

// NPS Templates
const NpsPremium = lazy(() => import("./nps/NpsPremium"));
const NpsSimple = lazy(() => import("./nps/NpsSimple"));
const NpsCards = lazy(() => import("./nps/NpsCards"));
const NpsWebinarCultura = lazy(() => import("./nps/NpsWebinarCultura"));
const NpsWebinarCulturaVip = lazy(() => import("./nps/NpsWebinarCulturaVip"));

// Registry mapping component_key strings to React components
export const templateRegistry: Record<string, ComponentType<TemplateComponentProps>> = {
  form_high_ticket: FormHighTicket,
  form_basic: FormBasic,
  lp_standard: LpStandard,
  form_construction: FormConstruction,
  form_grifo_talk: FormGrifoTalk,
};

// NPS Template Registry
export const npsTemplateRegistry: Record<string, ComponentType<NpsTemplateProps>> = {
  nps_premium: NpsPremium,
  nps_simple: NpsSimple,
  nps_cards: NpsCards,
  nps_webinar_cultura: NpsWebinarCultura,
  nps_webinar_cultura_vip: NpsWebinarCulturaVip,
};

export function getTemplateComponent(componentKey: string): ComponentType<TemplateComponentProps> | null {
  return templateRegistry[componentKey] || null;
}

export function getNpsTemplateComponent(componentKey: string): ComponentType<NpsTemplateProps> | null {
  return npsTemplateRegistry[componentKey] || null;
}

// Re-export NPS types
export type { NpsTemplateProps };
