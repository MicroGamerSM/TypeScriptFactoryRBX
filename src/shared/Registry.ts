import { SuccessCase, ValueSuccessCase } from "./SuccessCase";
import { Item, Recipe } from "./World";

export default class Registry {
	private static readonly items: Item[] = [];

	static AddItem(item: Item): SuccessCase {
		if (this.items.find((value) => value.id === item.id)) {
			return SuccessCase.Fail("Already exists by ID.");
		}
		this.items.push(item);
		return SuccessCase.Ok("Added to registry.");
	}

	static GetItem(id: string): ValueSuccessCase<Item | undefined> {
		const item = this.items.find((value) => value.id === id);
		if (item !== undefined) {
			return ValueSuccessCase.Ok("Item found by ID.", item);
		}

		return ValueSuccessCase.Fail("Could not find item by ID.", undefined);
	}

	private static readonly recipies: Recipe[] = [];

	static AddRecipe(recipe: Recipe): SuccessCase {
		if (this.recipies.find((value) => value.id === recipe.id)) {
			return SuccessCase.Fail("Already exists by ID.");
		}
		this.recipies.push(recipe);
		return SuccessCase.Ok("Added to registry.");
	}

	static GetRecipe(id: string): ValueSuccessCase<Recipe | undefined> {
		const recipe = this.recipies.find((value) => value.id === id);
		if (recipe !== undefined) {
			return ValueSuccessCase.Ok("Recipe found by ID.", recipe);
		}

		return ValueSuccessCase.Fail("Could not find recipe by ID.", undefined);
	}
}
