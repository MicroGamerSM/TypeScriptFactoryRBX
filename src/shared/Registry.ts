import { SuccessCase, ValueSuccessCase } from "./SuccessCase";
import { Item } from "./World";

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
}
