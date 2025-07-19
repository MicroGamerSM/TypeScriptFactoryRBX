import { SuccessCase, ValueSuccessCase } from "./SuccessCase";
import { Item, Recipe, SellPoint } from "./World";

type Identifiable = { id: string };

function IdFits(id: string | Identifiable): (target: Identifiable) => boolean {
	const value = typeIs(id, "string") ? id : id.id;
	return (target: Identifiable) => target.id === value;
}

function Lookup<T extends Identifiable>(list: T[], id: string): ValueSuccessCase<T | undefined> {
	const value: T | undefined = list.find(IdFits(id));
	return value === undefined
		? ValueSuccessCase.Fail("Lookup FAIL: Item missing", undefined)
		: ValueSuccessCase.Ok("Lookup GOOD", value);
}

function Push<T extends Identifiable>(list: T[], value: T): SuccessCase {
	if (list.find(IdFits(value))) return SuccessCase.Fail("Push FAIL: Already exists");
	list.push(value);
	return SuccessCase.Ok("Push GOOD");
}

export default class Registry {
	//#region Item
	private static readonly items: Item[] = [];

	static AddItem(item: Item): SuccessCase {
		return Push(this.items, item);
	}

	static GetItem(id: string): ValueSuccessCase<Item | undefined> {
		return Lookup(this.items, id);
	}

	//#region Recipe
	private static readonly recipies: Recipe[] = [];

	static AddRecipe(recipe: Recipe): SuccessCase {
		return Push(this.recipies, recipe);
	}

	static GetRecipe(id: string): ValueSuccessCase<Recipe | undefined> {
		return Lookup(this.recipies, id);
	}

	//#region SellPoint
	private static readonly sellPoints: SellPoint[] = [];

	static AddSellPoint(sellPoint: SellPoint): SuccessCase {
		return Push(this.sellPoints, sellPoint);
	}

	static GetSellPoint(id: string): ValueSuccessCase<SellPoint | undefined> {
		return Lookup(this.sellPoints, id);
	}
}
