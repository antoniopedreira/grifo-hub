import { lazy, ComponentType } from "react";

// Lazy load template components for better performance
const FormHighTicket = lazy(() => import("./FormHighTicket"));
const FormBasic = lazy(() => import("./FormBasic"));
const LpStandard = lazy(() => import("./LpStandard").then(m => ({ default: m.LpStandard })));

export interface TemplateComponentProps {
  product: {
    id: string;
    name: string;
    checkout_url?: string | null;
  };
}

// Registry mapping component_key strings to React components
export const templateRegistry: Record<string, ComponentType<TemplateComponentProps>> = {
  form_high_ticket: FormHighTicket,
  form_basic: FormBasic,
  lp_standard: LpStandard,
};

export function getTemplateComponent(componentKey: string): ComponentType<TemplateComponentProps> | null {
  return templateRegistry[componentKey] || null;
}
