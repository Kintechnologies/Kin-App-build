import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { createClient } from "@/lib/supabase/server";

interface MealPlanRequest {
  familyName: string;
  members: { name: string; age?: number; type: string }[];
  budget: number;
  dietaryPrefs: string[];
  foodLoves: string[];
  foodDislikes: string[];
  childrenAllergies?: string[]; // CRITICAL: allergen names to exclude from all meals
  nutritionGoals?: string[];
  calorieTarget?: number;
  proteinPriority?: boolean;
  healthyFats?: boolean;
  lowSugar?: boolean;
  selectedStores?: string[];
  separateKidGroceries?: boolean;
  hasKids?: boolean;
}

const storeNameMap: Record<string, string> = {
  costco: "Costco",
  walmart: "Walmart",
  aldi: "Aldi",
  "trader-joes": "Trader Joe's",
  "whole-foods": "Whole Foods",
  kroger: "Kroger",
  target: "Target",
  local: "Local grocery",
};

interface MealOption {
  id: string;
  name: string;
  prep_time_minutes: number;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  kid_friendly: boolean;
  description: string;
}

/**
 * Simple deterministic hash to pick a store index from an item name.
 * Consistent across calls — avoids Math.random() non-determinism (#23).
 */
function storeIndexForItem(itemName: string, storeCount: number): number {
  let hash = 0;
  for (let i = 0; i < itemName.length; i++) {
    hash = (hash * 31 + itemName.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % storeCount;
}

function generateMealOptions(data: MealPlanRequest) {
  const stores = (data.selectedStores || ["aldi", "walmart"]).map(
    (s) => storeNameMap[s] || s
  );

  const allMeals: Omit<MealOption, "id">[] = [
    // Breakfasts
    { name: "Greek Yogurt Parfait with Granola", meal_type: "breakfast", prep_time_minutes: 10, calories: 380, protein: 18, carbs: 45, fat: 12, kid_friendly: true, description: "Layer yogurt, granola, and fresh berries for a quick protein-packed start" },
    { name: "Scrambled Eggs with Spinach & Toast", meal_type: "breakfast", prep_time_minutes: 15, calories: 420, protein: 24, carbs: 30, fat: 22, kid_friendly: true, description: "Fluffy eggs with sautéed spinach on whole grain toast" },
    { name: "Overnight Oats with Berries & Chia", meal_type: "breakfast", prep_time_minutes: 5, calories: 350, protein: 14, carbs: 52, fat: 10, kid_friendly: true, description: "Prep the night before — grab and go in the morning" },
    { name: "Protein Banana Pancakes", meal_type: "breakfast", prep_time_minutes: 20, calories: 440, protein: 28, carbs: 48, fat: 14, kid_friendly: true, description: "Made with protein powder and mashed banana — kids love these" },
    { name: "Avocado Toast with Eggs & Seeds", meal_type: "breakfast", prep_time_minutes: 15, calories: 460, protein: 20, carbs: 35, fat: 28, kid_friendly: false, description: "Smashed avocado, poached eggs, everything seasoning" },
    { name: "Berry Protein Smoothie Bowl", meal_type: "breakfast", prep_time_minutes: 10, calories: 390, protein: 26, carbs: 50, fat: 8, kid_friendly: true, description: "Thick smoothie base topped with granola and sliced fruit" },
    { name: "Veggie Egg Muffins (make-ahead)", meal_type: "breakfast", prep_time_minutes: 25, calories: 320, protein: 22, carbs: 18, fat: 18, kid_friendly: true, description: "Batch cook on Sunday — reheat all week. Great for busy mornings" },
    { name: "Peanut Butter Banana Wrap", meal_type: "breakfast", prep_time_minutes: 5, calories: 410, protein: 16, carbs: 52, fat: 18, kid_friendly: true, description: "Whole wheat tortilla with PB, banana, and a drizzle of honey" },
    // Lunches
    { name: "Turkey & Avocado Wraps", meal_type: "lunch", prep_time_minutes: 10, calories: 480, protein: 32, carbs: 38, fat: 22, kid_friendly: true, description: "Deli turkey, avocado, cheese, and lettuce in a flour tortilla" },
    { name: "Grilled Chicken Power Bowl", meal_type: "lunch", prep_time_minutes: 15, calories: 520, protein: 38, carbs: 45, fat: 18, kid_friendly: false, description: "Brown rice, grilled chicken, roasted veggies, tahini drizzle" },
    { name: "Tomato Soup with Grilled Cheese", meal_type: "lunch", prep_time_minutes: 25, calories: 450, protein: 18, carbs: 48, fat: 20, kid_friendly: true, description: "Classic comfort. Use whole grain bread for extra fiber" },
    { name: "Chicken Caesar Salad", meal_type: "lunch", prep_time_minutes: 15, calories: 440, protein: 34, carbs: 18, fat: 26, kid_friendly: false, description: "Romaine, grilled chicken, parmesan, homemade dressing" },
    { name: "Chicken & Black Bean Quesadillas", meal_type: "lunch", prep_time_minutes: 15, calories: 510, protein: 34, carbs: 42, fat: 22, kid_friendly: true, description: "Loaded with protein and fiber. Serve with salsa and sour cream" },
    { name: "Mediterranean Grain Bowl", meal_type: "lunch", prep_time_minutes: 20, calories: 490, protein: 22, carbs: 56, fat: 20, kid_friendly: false, description: "Farro, chickpeas, cucumber, feta, olives, lemon vinaigrette" },
    { name: "Mac & Cheese with Hidden Veggies", meal_type: "lunch", prep_time_minutes: 20, calories: 460, protein: 18, carbs: 54, fat: 20, kid_friendly: true, description: "Butternut squash and cauliflower blended into the cheese sauce" },
    { name: "Tuna Salad Lettuce Wraps", meal_type: "lunch", prep_time_minutes: 10, calories: 380, protein: 30, carbs: 12, fat: 24, kid_friendly: false, description: "High protein, low carb. Mix with Greek yogurt instead of mayo" },
    // Dinners
    { name: "One-Pan Lemon Herb Chicken & Veggies", meal_type: "dinner", prep_time_minutes: 35, calories: 520, protein: 42, carbs: 28, fat: 24, kid_friendly: true, description: "Everything on one sheet pan — minimal cleanup" },
    { name: "Beef Tacos with Fresh Salsa", meal_type: "dinner", prep_time_minutes: 30, calories: 560, protein: 32, carbs: 44, fat: 26, kid_friendly: true, description: "Seasoned ground beef, fresh toppings. Let everyone build their own" },
    { name: "Pasta Primavera with Parmesan", meal_type: "dinner", prep_time_minutes: 25, calories: 480, protein: 18, carbs: 62, fat: 16, kid_friendly: true, description: "Loaded with seasonal veggies. Add chicken for extra protein" },
    { name: "Teriyaki Salmon with Brown Rice", meal_type: "dinner", prep_time_minutes: 30, calories: 540, protein: 36, carbs: 48, fat: 20, kid_friendly: false, description: "Omega-3 rich. Glaze with homemade teriyaki sauce" },
    { name: "Slow Cooker Chicken Curry", meal_type: "dinner", prep_time_minutes: 20, calories: 490, protein: 34, carbs: 42, fat: 18, kid_friendly: false, description: "Dump and go — let it cook while you work. Serve with naan" },
    { name: "Homemade Pizza Night", meal_type: "dinner", prep_time_minutes: 45, calories: 580, protein: 24, carbs: 58, fat: 26, kid_friendly: true, description: "Make dough together — everyone picks their toppings" },
    { name: "Grilled Burgers with Sweet Potato Fries", meal_type: "dinner", prep_time_minutes: 35, calories: 620, protein: 36, carbs: 52, fat: 28, kid_friendly: true, description: "Use lean beef or turkey. Bake the fries for a healthier twist" },
    { name: "Stir-Fry with Chicken & Broccoli", meal_type: "dinner", prep_time_minutes: 25, calories: 460, protein: 36, carbs: 34, fat: 16, kid_friendly: true, description: "Quick weeknight meal. Serve over rice or noodles" },
    // Snacks
    { name: "Protein Energy Balls", meal_type: "snack", prep_time_minutes: 15, calories: 180, protein: 12, carbs: 18, fat: 8, kid_friendly: true, description: "Oats, peanut butter, honey, chocolate chips. Make a batch Sunday" },
    { name: "Apple Slices with Almond Butter", meal_type: "snack", prep_time_minutes: 3, calories: 220, protein: 6, carbs: 28, fat: 12, kid_friendly: true, description: "Simple and satisfying. Great after school snack" },
    { name: "Trail Mix (nuts, seeds, dark chocolate)", meal_type: "snack", prep_time_minutes: 0, calories: 250, protein: 8, carbs: 22, fat: 16, kid_friendly: true, description: "Make your own blend. Healthy fats for sustained energy" },
    { name: "Cottage Cheese with Pineapple", meal_type: "snack", prep_time_minutes: 3, calories: 160, protein: 18, carbs: 16, fat: 4, kid_friendly: false, description: "High protein, low fat. Great post-workout snack" },
    { name: "Hard-Boiled Eggs (2)", meal_type: "snack", prep_time_minutes: 12, calories: 140, protein: 12, carbs: 1, fat: 10, kid_friendly: false, description: "Batch cook a dozen on Sunday. Easy protein grab" },
    { name: "Hummus with Veggie Sticks", meal_type: "snack", prep_time_minutes: 5, calories: 180, protein: 6, carbs: 20, fat: 10, kid_friendly: true, description: "Carrots, celery, bell pepper strips. Kids love dipping" },
    { name: "Greek Yogurt with Honey & Walnuts", meal_type: "snack", prep_time_minutes: 3, calories: 240, protein: 16, carbs: 22, fat: 12, kid_friendly: true, description: "Protein-rich with healthy fats. Satisfying between meals" },
    { name: "Cheese & Crackers with Grapes", meal_type: "snack", prep_time_minutes: 3, calories: 200, protein: 8, carbs: 24, fat: 10, kid_friendly: true, description: "Classic snack plate. Quick and no-cook" },
  ];

  // Filter out dislikes AND allergens (CRITICAL safety requirement)
  const allergenList = (data.childrenAllergies || []).map((a) => a.toLowerCase());
  const filtered = allMeals.filter((meal) => {
    const nameLower = meal.name.toLowerCase();
    const descLower = meal.description.toLowerCase();

    // Exclude if matches any dislike
    if (data.foodDislikes.some((d) => nameLower.includes(d.toLowerCase()))) {
      return false;
    }

    // Exclude if contains any known allergen (non-negotiable safety)
    if (allergenList.some((allergen) => nameLower.includes(allergen) || descLower.includes(allergen))) {
      return false;
    }

    return true;
  });

  const byType = (type: string) =>
    filtered
      .filter((m) => m.meal_type === type)
      .map((m) => ({ ...m, id: randomUUID() }));

  const breakfastOptions = byType("breakfast");
  const lunchOptions = byType("lunch");
  const dinnerOptions = byType("dinner");
  const snackOptions = byType("snack");

  // Deterministic store assignment per grocery item — consistent across calls (#23 fix)
  const groceryItems = [
    { name: "Chicken breasts (2 lbs)", quantity: "1 pack", estimated_cost: 8.99, section: "Meat", savings_tip: "Buy the family pack for better value" },
    { name: "Ground beef or turkey (1 lb)", quantity: "1 pack", estimated_cost: 5.99, section: "Meat" },
    { name: "Salmon fillets (4)", quantity: "1 pack", estimated_cost: 12.99, section: "Seafood", savings_tip: "Frozen wild-caught is half the price of fresh" },
    { name: "Eggs (18 count)", quantity: "1 carton", estimated_cost: 4.49, section: "Dairy" },
    { name: "Greek yogurt (32 oz)", quantity: "1 tub", estimated_cost: 5.49, section: "Dairy" },
    { name: "Shredded cheese (2 lbs)", quantity: "1 bag", estimated_cost: 7.99, section: "Dairy" },
    { name: "Whole wheat bread", quantity: "1 loaf", estimated_cost: 3.49, section: "Bakery" },
    { name: "Flour tortillas (10 pack)", quantity: "1 pack", estimated_cost: 3.49, section: "Bakery" },
    { name: "Brown rice (5 lb bag)", quantity: "1 bag", estimated_cost: 4.99, section: "Grains & Pasta" },
    { name: "Pasta (1 lb)", quantity: "2 boxes", estimated_cost: 2.78, section: "Grains & Pasta" },
    { name: "Rolled oats", quantity: "1 canister", estimated_cost: 3.99, section: "Grains & Pasta" },
    { name: "Bananas", quantity: "1 bunch", estimated_cost: 1.29, section: "Produce" },
    { name: "Avocados", quantity: "4", estimated_cost: 3.96, section: "Produce" },
    { name: "Baby spinach", quantity: "1 bag", estimated_cost: 2.99, section: "Produce" },
    { name: "Broccoli", quantity: "2 crowns", estimated_cost: 3.49, section: "Produce" },
    { name: "Mixed frozen vegetables", quantity: "2 bags", estimated_cost: 5.98, section: "Frozen" },
    { name: "Frozen berries (mixed)", quantity: "1 bag", estimated_cost: 4.99, section: "Frozen" },
    { name: "Almond butter", quantity: "1 jar", estimated_cost: 6.99, section: "Pantry" },
    { name: "Olive oil", quantity: "1 bottle", estimated_cost: 6.99, section: "Pantry" },
    { name: "Honey", quantity: "1 bottle", estimated_cost: 5.99, section: "Pantry" },
  ].map((item) => ({
    ...item,
    recommended_store: stores[storeIndexForItem(item.name, stores.length)],
  }));

  // Kid-specific grocery items
  const kidGroceryItems = data.hasKids
    ? [
        { name: "Goldfish crackers", quantity: "1 box", estimated_cost: 3.49, section: "Kids Snacks", recommended_store: stores[0] },
        { name: "Apple sauce pouches (6 pack)", quantity: "1 box", estimated_cost: 4.99, section: "Kids Snacks", recommended_store: stores[0] },
        { name: "String cheese (12 pack)", quantity: "1 pack", estimated_cost: 5.49, section: "Kids Snacks", recommended_store: stores[0] },
        { name: "Chicken nuggets (frozen)", quantity: "1 bag", estimated_cost: 6.99, section: "Kids Meals", recommended_store: stores[0] },
        { name: "Mac & cheese boxes", quantity: "3 boxes", estimated_cost: 3.57, section: "Kids Meals", recommended_store: stores[0] },
        { name: "Juice boxes (variety)", quantity: "1 pack", estimated_cost: 4.99, section: "Kids Drinks", recommended_store: stores[0] },
      ]
    : [];

  return {
    breakfast_options: breakfastOptions,
    lunch_options: lunchOptions,
    dinner_options: dinnerOptions,
    snack_options: snackOptions,
    grocery_items: groceryItems,
    kid_grocery_items: kidGroceryItems,
    separate_kid_groceries: data.separateKidGroceries || false,
    stores,
    estimated_weekly_total: Math.round(data.budget * 0.85 * 100) / 100,
    nutrition_summary: {
      avg_daily_calories: data.calorieTarget || 2000,
      protein_focus: data.proteinPriority || false,
      goals: data.nutritionGoals || [],
    },
  };
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data: MealPlanRequest = await request.json();
    const mealOptions = generateMealOptions(data);

    // Persist meal plan to DB so it survives page refresh (#26)
    try {
      const supabase = createClient();
      // Calculate week_start (Monday of current week)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + daysToMonday);
      const weekStartStr = weekStart.toISOString().split("T")[0];

      await supabase.from("meal_plans").insert({
        profile_id: user.id,
        meal_options: mealOptions,
        week_start: weekStartStr,
      });
    } catch {
      // Non-fatal — silently continue. User still gets their meal plan in-session.
      // TODO: route to structured error logging (Sentry) before GA.
    }

    return NextResponse.json({ mealOptions });
  } catch {
    return NextResponse.json({ error: "Failed to generate meal options" }, { status: 500 });
  }
}
