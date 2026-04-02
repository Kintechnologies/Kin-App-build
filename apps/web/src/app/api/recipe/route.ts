import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";

// Mock recipes keyed by meal name
const mockRecipes: Record<string, string> = {};

function generateMockRecipe(mealName: string): string {
  // Generate a plausible mock recipe
  return `## ${mealName}

### Ingredients
- 2 lbs protein (chicken, beef, or salmon depending on dish)
- 2 cups mixed vegetables
- 1 tbsp olive oil
- 2 cloves garlic, minced
- Salt and pepper to taste
- 1 cup grain (rice, pasta, or bread)
- Fresh herbs for garnish

### Instructions
1. **Prep** (5 min): Wash and chop all vegetables. Pat protein dry and season with salt and pepper.
2. **Cook protein** (8-10 min): Heat olive oil in a large skillet over medium-high heat. Cook protein until golden on each side.
3. **Add aromatics** (2 min): Add garlic and cook until fragrant, about 30 seconds.
4. **Add vegetables** (5-7 min): Toss in vegetables and cook until tender-crisp.
5. **Season & serve**: Adjust seasoning, plate over your grain of choice, and garnish with fresh herbs.

### Tips
- **Make it ahead**: Prep ingredients the night before and store in containers.
- **Kid-friendly version**: Serve sauce on the side so kids can dip.
- **Leftovers**: Great for next-day lunch bowls — just reheat and add fresh greens.

### Nutrition (per serving)
Calories, protein, carbs, and fat will vary based on specific ingredients used. See the meal card for estimated macros.`;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mealName } = await request.json();

    if (!mealName) {
      return NextResponse.json({ error: "Meal name is required" }, { status: 400 });
    }

    // Check cache
    if (mockRecipes[mealName]) {
      return NextResponse.json({ recipe: mockRecipes[mealName] });
    }

    // TODO: When Anthropic API key is set, generate real recipes
    // For now, return a structured mock
    const recipe = generateMockRecipe(mealName);
    mockRecipes[mealName] = recipe;

    // Small delay to feel realistic
    await new Promise((r) => setTimeout(r, 800));

    return NextResponse.json({ recipe });
  } catch {
    return NextResponse.json({ error: "Failed to generate recipe" }, { status: 500 });
  }
}
