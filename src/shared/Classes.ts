import { Profile } from "@rbxts/profile-store";
import { Event, Function } from "./Networker";
import { SuccessCase, ValueSuccessCase } from "./SuccessCase";

const HttpService = game.GetService("HttpService");
const WORLD_DATA_SOURCE_URL =
	"https://raw.githubusercontent.com/MicroGamerSM/TypeScriptFactoryRBX/refs/heads/master/world.json";

const RunService = game.GetService("RunService");

const isServer = RunService.IsServer();
const isClient = RunService.IsClient();

const MoneyUpdatedEvent: Event<[], [number]> = Event.GetEvent("update.money");

export type NotUndefined<T> = Exclude<T, undefined>;
export type ChangeListener<T> = <K extends keyof T>(key: K, oldValue: T[K], newValue: T[K]) => void;
export type JsonItem = {
	Name: string;
	Description: string;
	Price: number;
	SellValue: number;
	Tags: string[];
};
export type JsonRecipe = {
	Type: string;
	Input: Map<string, number>;
	Output: Map<string, number>;
};
export type WorldData = {
	Items: JsonItem[];
	Recipes: JsonRecipe[];
};

export enum ToolType {
	None = 0,
	Wood = 1,
	Stone = 2,
	Bronze = 3,
	Iron = 4,
}

export class Item {
	readonly name: string;
	readonly description: string;
	readonly price: number;
	readonly sellValue: number;
	readonly tags: string[];

	CanSell(): boolean {
		return this.sellValue !== 0;
	}

	HasTag(tag: string): boolean {
		return this.tags.includes(tag);
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

	static GetAllFromRegistryWithTag(tag: string): Item[] {
		return Item.registry.filter((item) => item.HasTag(tag));
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

	constructor(
		name: string,
		description: string = "No description given.",
		price: number = 0,
		sellValue: number = 0,
		tags: string[] = [],
	) {
		this.name = name;
		this.description = description;
		this.price = price;
		this.sellValue = sellValue;
		this.tags = tags;
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
		setmetatable(this, {
			__index: (thisObject, key) => {
				const thisData = rawget(thisObject, key);
				if (thisData === undefined) {
					return rawget(Observable, key);
				}
				return thisData;
			},
			__newindex: (thisObject, key, value) => {
				const oldValue = rawget(thisObject, key);
				if (oldValue !== value) {
					rawset(thisObject, key, value);
					for (const listener of this._listeners) {
						listener(key as keyof T, oldValue as never, value as never);
					}
				}
			},
		});
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

	constructor(source: Profile<IPlayerData, object>, player: Player) {
		super(source.Data);
		this.money = source.Data.money;
		this.axeTool = source.Data.axeTool;
		this.axeLostDurability = source.Data.axeLostDurability;
		this.pickaxeTool = source.Data.pickaxeTool;
		this.pickaxeLostDurability = source.Data.pickaxeLostDurability;
		this.shovelTool = source.Data.shovelTool;
		this.shovelLostDurability = source.Data.shovelLostDurability;

		if (isClient)
			error(
				"Cannot create PlayerDetails on client. Ask the server for a readonly reference (get.playerdata).",
				2,
			);

		this.Changed((key, oldV, newV) => {
			if (source.IsActive()) source.Data[key] = newV;
			else warn("Using PlayerDetails after Profile is disabled!");

			if (key === "money") {
				MoneyUpdatedEvent.FireClient(player, this.money);
			}
		});
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

//#region World Data
const GetWorldFunction: Function<[], [WorldData], [], []> = Function.GetFunction("http.world");

if (isServer)
	GetWorldFunction.OnServerInvoke((player: Player) => {
		return [HttpService.JSONDecode(HttpService.GetAsync(WORLD_DATA_SOURCE_URL)) as WorldData];
	});

try {
	const world = isServer
		? (HttpService.JSONDecode(HttpService.GetAsync(WORLD_DATA_SOURCE_URL)) as WorldData)
		: GetWorldFunction.FireServer()[0];
	world.Items.map((item) => Item.BuildFromJsonItem(item).AddToRegistry());
} catch (e) {
	warn(
		"A critical failure has occured: The game failed to load remote resources, being the Base Item Registry. Please check your internet connection.",
		e,
	);
}
//#endregion
