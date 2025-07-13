import { Profile } from "@rbxts/profile-store";

const HttpService = game.GetService("HttpService");
const ITEM_LIST_RAW_GITHUB_URL =
	"https://raw.githubusercontent.com/MicroGamerSM/TypeScriptFactoryRBX/refs/heads/master/itemList.json";

export type NotUndefined<T> = Exclude<T, undefined>;
export type ChangeListener<T> = <K extends keyof T>(key: K, oldValue: T[K], newValue: T[K]) => void;
export type JsonItem = {
	Name: string;
	Description: string;
	Price: number;
	SellValue: number;
};

export enum ToolType {
	None = 0,
	Wood = 1,
	Stone = 2,
	Bronze = 3,
	Iron = 4,
}

export class Registry {
	//overloads
	static Get(name: string): Item | undefined;
	static Get(name: string): Buildable | undefined;
	//actual function
	static Get(name: string) {
		return Item.GetFromReigstry(name) ?? Buildable.GetFromReigstry(name);
	}

	//overloads
	static Add(obj: Item): SuccessCase;
	static Add(obj: Buildable): SuccessCase;
	//actual function
	static Add(obj: Item | Buildable): SuccessCase {
		return obj.AddToRegistry();
	}
}

export class Item {
	name: string;
	description: string;
	price: number;
	sellValue: number;

	CanSell(): boolean {
		return this.sellValue !== 0;
	}

	private static registry: Item[] = [];

	AddToRegistry(): SuccessCase {
		if (Item.registry.includes(this)) return SuccessCase.Fail("Already in registry");
		if (Item.registry.some((obj) => obj.name === this.name) !== undefined)
			return SuccessCase.Fail("Already in registry by name");

		Item.registry.insert(Item.registry.size(), this);
		return SuccessCase.Ok("Added to registry");
	}

	static GetFromReigstry(name: string): Item | undefined {
		return this.registry.find((item) => item.name === name);
	}

	static BuildFromJson(json: string): Item {
		const objTable = HttpService.JSONDecode(json) as JsonItem;
		return Item.BuildFromJsonItem(objTable);
	}

	static BuildFromJsonItem(jitem: JsonItem): Item {
		return new Item(jitem.Name, jitem.Description, jitem.Price, jitem.SellValue);
	}

	static BuildJsonArrayToRegistry(array: string) {
		const items = HttpService.JSONDecode(array) as JsonItem[];
		items.map((item) => this.BuildFromJsonItem(item).AddToRegistry());
	}

	constructor(name: string, description: string = "No description given.", price: number = 0, sellValue: number = 0) {
		this.name = name;
		this.description = description;
		this.price = price;
		this.sellValue = sellValue;
	}
}

export interface IPlayerData {
	money: number;
	axeTool: ToolType;
	axeLostDurability: number;
	pickaxeTool: ToolType;
	pickaxeLostDurability: number;
	shovelTool: ToolType;
	shovelLostDurability: number;
}

export abstract class Observable<T extends object> {
	private readonly _listeners = new Set<ChangeListener<T>>();

	/** Subscribes to property changes. Returns an unsubscribe function. */
	Changed(fn: ChangeListener<T>): () => void {
		this._listeners.add(fn);
		return () => this._listeners.delete(fn);
	}

	protected constructor(initial: T) {
		// 1. Shallow-copy the fields before setting up the metatable
		for (const [k, v] of pairs(initial as Record<string, unknown>)) {
			(this as Record<string, unknown>)[k] = v;
		}

		// 2. Install metatable to observe changes
		return setmetatable(this, {
			__index: (thisObject, key) => rawget(thisObject, key),
			__newindex: (thisObject, key, value) => {
				const oldValue = rawget(thisObject, key);
				if (oldValue !== value) {
					rawset(thisObject, key, value);
					for (const listener of this._listeners) {
						listener(key as keyof T, oldValue as never, value as never);
					}
				}
			},
		}) as never;
	}
}

export class Buildable {
	name: string;
	description: string;
	requiredMaterials: Map<Item, number>;

	private static registry: Buildable[] = [];

	AddToRegistry(): SuccessCase {
		if (Buildable.registry.includes(this)) return SuccessCase.Fail("Already in registry");
		if (Buildable.registry.some((obj) => obj.name === this.name) !== undefined)
			return SuccessCase.Fail("Already in registry by name");

		Buildable.registry.insert(Buildable.registry.size(), this);
		return SuccessCase.Ok("Added to registry");
	}

	static GetFromReigstry(name: string): Buildable | undefined {
		return this.registry.find((buildable) => buildable.name === name);
	}

	constructor(name: string, description: string = "No description given.", requiredMaterials: Map<Item, number>) {
		this.name = name;
		this.description = description;
		this.requiredMaterials = new Map();

		requiredMaterials.forEach((value: number, key: Item, _) => {
			const actualValue = math.round(math.abs(value));
			if (actualValue === 0) {
				return;
			}
			this.requiredMaterials.set(key, actualValue);
		});
	}
}

export class BuiltObject {
	position: Vector3;
	rotation: number;
	buildable: Buildable;
	beingBuilt: boolean;
	buildingMaterialsRequired: Map<Item, number> | undefined;

	InsertItem(item: Item, amount: number): number {
		if (this.buildingMaterialsRequired === undefined) return amount;

		const requiredAmount = this.buildingMaterialsRequired.get(item);
		if (requiredAmount === undefined || requiredAmount <= 0) return amount;

		const toInsert = math.min(amount, requiredAmount);
		const remainingRequired = requiredAmount - toInsert;

		if (remainingRequired > 0) {
			this.buildingMaterialsRequired.set(item, remainingRequired);
		} else {
			this.buildingMaterialsRequired.delete(item);
		}

		this.CheckCanBecomeBuilt();

		const leftover = amount - toInsert;
		return leftover;
	}

	CheckCanBecomeBuilt() {
		if (this.buildingMaterialsRequired === undefined) return;
		if (!this.buildingMaterialsRequired.isEmpty()) return;

		this.buildingMaterialsRequired = undefined;
		this.beingBuilt = false;
	}

	static StartBuilding(position: Vector3, rotation: number, buildable: Buildable) {
		return new BuiltObject(position, rotation, buildable, true, buildable.requiredMaterials);
	}

	constructor(
		position: Vector3,
		rotation: number,
		buildable: Buildable,
		beingBuilt: boolean,
		buildingMaterialsRequired: Map<Item, number> | undefined,
	) {
		this.position = position;
		this.rotation = rotation;
		this.buildable = buildable;
		this.beingBuilt = beingBuilt;
		this.buildingMaterialsRequired = buildingMaterialsRequired;

		if (beingBuilt && buildingMaterialsRequired === undefined) {
			this.buildingMaterialsRequired = buildable.requiredMaterials;
		} else if (!beingBuilt) {
			this.buildingMaterialsRequired = undefined;
		}
	}
}

export class PlayerDetails extends Observable<IPlayerData> implements IPlayerData {
	money: number;
	axeTool: ToolType;
	axeLostDurability: number;
	pickaxeTool: ToolType;
	pickaxeLostDurability: number;
	shovelTool: ToolType;
	shovelLostDurability: number;

	constructor(source: Profile<IPlayerData, object>) {
		super(source.Data);
		this.money = source.Data.money;
		this.axeTool = source.Data.axeTool;
		this.axeLostDurability = source.Data.axeLostDurability;
		this.pickaxeTool = source.Data.pickaxeTool;
		this.pickaxeLostDurability = source.Data.pickaxeLostDurability;
		this.shovelTool = source.Data.shovelTool;
		this.shovelLostDurability = source.Data.shovelLostDurability;

		this.Changed((key, oldV, newV) => {
			if (source.IsActive()) source.Data[key] = newV;
			else warn("Using PlayerDetails after Profile is disabled!");
		});
	}
}

// Represents a possible failure.
export class SuccessCase {
	readonly success: boolean;
	readonly message: string;

	// Returns a tuple representing the SuccessCase.
	ToTuple(): LuaTuple<[boolean, string]> {
		return $tuple(this.success, this.message);
	}

	// Warns if the SuccessCase contains a failure, prints otherwise.
	Display() {
		if (this.success) {
			print(this.message);
		} else {
			warn(this.message);
		}
	}

	// Errors if the SuccessCase contains a failure, prints otherwise.
	Assert() {
		if (this.success) {
			print(this.message);
		} else {
			error(this.message, 2);
		}
	}

	// Creates a SuccessCase from a tuple.
	static FromTuple(source: LuaTuple<[boolean, string]>) {
		return new SuccessCase(source[0], source[1]);
	}

	static Try<F extends (...args: readonly unknown[]) => undefined>(method: F, ...args: Parameters<F>): SuccessCase {
		try {
			method(...args);
		} catch (error) {
			if (typeOf(error) === "string") {
				return SuccessCase.Fail((error as string) ?? "Failed to parse the error message as a string.");
			}
		}
		return SuccessCase.Ok("The function completed successfully.");
	}

	// Creates a successful SuccessCase.
	static Ok(message: string): SuccessCase {
		return new SuccessCase(true, message);
	}

	// Creates an unsuccessful SuccessCase.
	static Fail(message: string): SuccessCase {
		return new SuccessCase(false, message);
	}

	static FromValueSuccessCase<J>(valueSuccessCase: ValueSuccessCase<J>): SuccessCase {
		return new SuccessCase(valueSuccessCase.success, valueSuccessCase.message);
	}

	private constructor(success: boolean, message: string) {
		this.success = success;
		this.message = message;
	}

	// Generates a string based on the SuccessCase.
	toString(): string {
		return `${this.success ? "✔️" : "✖️"} ${this.message}`;
	}
}

// Represents a possible failure, with data.
export class ValueSuccessCase<T> {
	readonly success: boolean;
	readonly message: string;
	readonly data: T;

	// Returns a tuple representing the ValueSuccessCase.
	ToTuple(): LuaTuple<[boolean, string, T]> {
		return $tuple(this.success, this.message, this.data);
	}

	// Returns a SuccessCase, discarding the data present.
	ToSuccessCase(): SuccessCase {
		return SuccessCase.FromValueSuccessCase(this);
	}

	// Returns a fallback value if the case represents a failure. The fallback cannot be undefined, and will never return undefined.
	DefaultValue(fallback: NotUndefined<T>): NotUndefined<T> {
		if (this.success) {
			if (this.data !== undefined) {
				print("not undefined successful data");
				return this.data as NotUndefined<T>;
			}
		}
		return fallback;
	}

	// Warns if the SuccessCase contains a failure, prints otherwise.
	Display() {
		if (this.success) {
			print(this.message);
		} else {
			warn(this.message);
		}
	}

	// Errors if the SuccessCase contains a failure, prints otherwise.
	Assert() {
		if (this.success) {
			print(this.message);
		} else {
			error(this.message, 2);
		}
	}

	// Creates a ValueSuccessCase from a tuple.
	static FromTuple<T>(source: LuaTuple<[boolean, string, T]>): ValueSuccessCase<T> {
		return new ValueSuccessCase(source[0], source[1], source[2]);
	}

	static Try<F extends (...args: readonly unknown[]) => J, J>(
		method: F,
		...args: Parameters<F>
	): ValueSuccessCase<J | undefined> {
		try {
			return ValueSuccessCase.Ok("The function completed successfully", method(...args));
		} catch (error) {
			if (typeOf(error) === "string") {
				return ValueSuccessCase.Fail(
					(error as string) ?? "Failed to parse the error message as a string.",
					undefined,
				);
			}
		}
		error("Managed to exit try-catch.");
	}

	// Creates a successful ValueSuccessCase.
	static Ok<T>(message: string, data: T): ValueSuccessCase<T> {
		return new ValueSuccessCase(true, message, data);
	}

	// Creates an unsuccessful ValueSuccessCase.
	static Fail<T>(message: string, data: T): ValueSuccessCase<T> {
		return new ValueSuccessCase(false, message, data);
	}

	private constructor(success: boolean, message: string, data: T) {
		this.success = success;
		this.message = message;
		this.data = data;
	}

	// Generates a string based on the ValueSuccessCase.
	toString(): string {
		return `${this.success ? "✔️" : "✖️"} ${this.message}`;
	}
}
// Generates a default player data object.
export function BuildDefaultPlayerData(): IPlayerData {
	return {
		money: 100,
		axeTool: ToolType.Wood,
		axeLostDurability: 0,
		pickaxeTool: ToolType.None,
		pickaxeLostDurability: 0,
		shovelTool: ToolType.None,
		shovelLostDurability: 0,
	};
}

try {
	const itemList = HttpService.GetAsync(ITEM_LIST_RAW_GITHUB_URL);
	Item.BuildJsonArrayToRegistry(itemList);
} catch (e) {
	warn(
		"A critical failure has occured: The game failed to load remote resources, being the Base Item Registry. Please check your internet connection.",
		e,
	);
}
