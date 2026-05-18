import rawPersonas from "../data/personas.json";
import type { DemoCustomer, DemoPurchase } from "../types";

export const personas = rawPersonas as DemoCustomer[];

export const defaultPersona = personas[0];

export function findPersonaById(id: string | null | undefined): DemoCustomer {
  return personas.find((persona) => persona.id === id) ?? defaultPersona;
}

export function getRemainingBudget(persona: DemoCustomer): number {
  return Math.max(persona.monthlyBudget - persona.spentThisMonth, 0);
}

export function getSimilarPurchases(
  persona: DemoCustomer,
  category: string,
): DemoPurchase[] {
  return persona.purchases.filter((purchase) => purchase.category === category);
}

export function usageLabel(value: DemoPurchase["usage"]): string {
  const labels: Record<DemoPurchase["usage"], string> = {
    never: "Hic kullanilmadi",
    rarely: "Nadiren",
    sometimes: "Ara sira",
    often: "Sik sik",
    daily: "Her gun",
  };

  return labels[value];
}

export function satisfactionLabel(value: DemoPurchase["satisfaction"]): string {
  const labels: Record<DemoPurchase["satisfaction"], string> = {
    regretted: "Pisman",
    neutral: "Notr",
    satisfied: "Memnun",
  };

  return labels[value];
}
