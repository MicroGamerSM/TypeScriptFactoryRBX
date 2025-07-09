export type NotUndefined<T> = Exclude<T, undefined>;

export enum ToolType {
	None = 0,
	Wood = 1,
	Stone = 2,
	Bronze = 3,
	Iron = 4,
}

export enum Item {
	OakLog = "Oak Log",
	Pillar = "Pillar",
	Plank = "Plank",
	Nails = "Nails",
	WoodFrame = "Wood Frame",
}

export class Buildable {
	name: string;
	description: string;
	requiredMaterials: Map<Item, number>;

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

		this.CheckCanBuild();

		const leftover = amount - toInsert;
		return leftover;
	}

	CheckCanBuild() {
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

export interface IPlayerData {
	Money: number;
	AxeTool: ToolType;
	AxeLostDurability: number;
	PickaxeTool: ToolType;
	PickaxeLostDurability: number;
	ShovelTool: ToolType;
	ShovelLostDurability: number;
}

// Generates a default player data object.
export function BuildDefaultPlayerData(): IPlayerData {
	return {
		Money: 100,
		AxeTool: ToolType.Wood,
		AxeLostDurability: 0,
		PickaxeTool: ToolType.None,
		PickaxeLostDurability: 0,
		ShovelTool: ToolType.None,
		ShovelLostDurability: 0,
	};
}

// Represents a possible failure.
export class SuccessCase {
	readonly success: boolean;
	readonly message: string;

	// Returns a tuple representing the SuccessCase.
	ToTuple(): LuaTuple<[boolean, string]> {
		return $tuple(this.success, this.message);
	}

	// Warns in the SuccessCase contains a failure, prints otherwise.
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
