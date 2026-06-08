export declare class RecipeIngredientDto {
    itemId: string;
    quantity: number;
    unit?: string;
    unitCost?: number;
}
export declare class CreateRecipeDto {
    name: string;
    category: string;
    servings: number;
    yieldPercentage?: number;
    prepTimeMinutes?: number;
    instructions?: string;
    targetFoodCost?: number;
    sellingPrice?: number;
    isActive?: boolean;
    menuItemId?: string;
    ingredients: RecipeIngredientDto[];
}
