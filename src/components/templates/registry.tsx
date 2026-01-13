import { lazy, ComponentType } from "react";

// Lazy load template components for better performance
const FormHighTicket = lazy(() => import("./FormHighTicket"));
const FormBasic = lazy(() => import("./FormBasic"));

// Registry mapping component_key strings to React components
export const templateRegistry: Record<string, ComponentType<{ product: any }>> = {
  form_high_ticket: FormHighTicket,
  form_basic: FormBasic,
};

export function getTemplateComponent(componentKey: string): ComponentType<{ product: any }> | null {
  return templateRegistry[componentKey] || null;
}
