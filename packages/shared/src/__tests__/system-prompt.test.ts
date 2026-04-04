import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../system-prompt";

// Minimal valid context — extend per-test as needed
const base = {
  family_name: "Smith",
  household_type: "two-parent",
  p1_name: "Alice",
  kids: [] as { name: string; age: number }[],
  pets: [] as { name: string }[],
  grocery_budget: 200,
  dietary_preferences: [] as string[],
  food_loves: [] as string[],
  food_dislikes: [] as string[],
};

describe("buildSystemPrompt — allergy safety", () => {
  it("always includes the CHILDREN'S ALLERGIES section header", () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt).toContain("CHILDREN'S ALLERGIES");
  });

  it("includes the NON-NEGOTIABLE SAFETY label", () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt).toContain("NON-NEGOTIABLE SAFETY");
  });

  it("defaults to 'No known allergies' when children_allergies is undefined", () => {
    const prompt = buildSystemPrompt(base);
    expect(prompt).toContain("No known allergies");
  });

  it("defaults to 'No known allergies' when children_allergies is an empty string", () => {
    const prompt = buildSystemPrompt({ ...base, children_allergies: "" });
    // empty string is falsy — same fallback behaviour
    expect(prompt).toContain("No known allergies");
  });

  it("includes allergen text when a child has a single allergy", () => {
    const prompt = buildSystemPrompt({
      ...base,
      children_allergies: "Emma: peanuts (severe)",
    });
    expect(prompt).toContain("Emma: peanuts (severe)");
    expect(prompt).not.toContain("No known allergies");
  });

  it("includes all allergens for multiple children with different allergies", () => {
    const prompt = buildSystemPrompt({
      ...base,
      children_allergies: "Emma: peanuts (severe), Jake: dairy (moderate — use oat milk)",
    });
    expect(prompt).toContain("Emma: peanuts (severe)");
    expect(prompt).toContain("Jake: dairy (moderate — use oat milk)");
  });

  it("preserves allergen text verbatim — no truncation or transformation", () => {
    const raw =
      "Mia: tree nuts (anaphylactic — carries EpiPen), Tom: shellfish (mild), Sam: gluten (celiac — strict cross-contamination rules)";
    const prompt = buildSystemPrompt({ ...base, children_allergies: raw });
    expect(prompt).toContain(raw);
  });

  it("allergen section appears before the MEAL PLANNING section", () => {
    const allergen = "Emma: peanuts (severe)";
    const prompt = buildSystemPrompt({ ...base, children_allergies: allergen });
    const allergyIdx = prompt.indexOf(allergen);
    const mealIdx = prompt.indexOf("MEAL PLANNING");
    expect(allergyIdx).toBeGreaterThan(-1);
    expect(mealIdx).toBeGreaterThan(-1);
    expect(allergyIdx).toBeLessThan(mealIdx);
  });

  it("allergen section appears before ABSOLUTE LIMITS section", () => {
    const allergen = "Emma: peanuts (severe)";
    const prompt = buildSystemPrompt({ ...base, children_allergies: allergen });
    const allergyIdx = prompt.indexOf(allergen);
    const limitsIdx = prompt.indexOf("ABSOLUTE LIMITS");
    expect(allergyIdx).toBeLessThan(limitsIdx);
  });

  it("includes allergens even when kids array is empty (family-level allergy context)", () => {
    const prompt = buildSystemPrompt({
      ...base,
      kids: [],
      children_allergies: "Visiting nephew: bee stings (severe)",
    });
    expect(prompt).toContain("Visiting nephew: bee stings (severe)");
  });

  it("includes allergens when kids array is populated", () => {
    const prompt = buildSystemPrompt({
      ...base,
      kids: [
        { name: "Emma", age: 8, dietary: "no peanuts" },
        { name: "Jake", age: 5 },
      ],
      children_allergies: "Emma: peanuts (severe)",
    });
    // Allergy block present
    expect(prompt).toContain("Emma: peanuts (severe)");
    // Kids block also present
    expect(prompt).toContain("Emma");
    expect(prompt).toContain("Jake");
  });
});
