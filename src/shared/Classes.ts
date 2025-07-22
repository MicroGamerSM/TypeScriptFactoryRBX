import { Profile } from "@rbxts/profile-store";
import { EventV2 } from "./Networker";
import { SuccessCase } from "./SuccessCase";

const HttpService = game.GetService("HttpService");
const WORLD_DATA_SOURCE_URL =
	"https://raw.githubusercontent.com/MicroGamerSM/TypeScriptFactoryRBX/refs/heads/master/world.json";

const RunService = game.GetService("RunService");

const isServer = RunService.IsServer();
const isClient = RunService.IsClient();

export type NotUndefined<T> = Exclude<T, undefined>;
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

export class Buildable {
	name: string;
	description: string;
	requiredMaterials: Map<string, number>;

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

	constructor(name: string, description: string = "No description given.", requiredMaterials: Map<string, number>) {
		this.name = name;
		this.description = description;
		this.requiredMaterials = new Map();

		requiredMaterials.forEach((value: number, key: string, _) => {
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
	buildingMaterialsRequired: Map<string, number> | undefined;

	InsertItem(item: string, amount: number): number {
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
		buildingMaterialsRequired: Map<string, number> | undefined,
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
