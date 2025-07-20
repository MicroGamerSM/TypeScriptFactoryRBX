import JSONItem from "./json/Item";
import JSONRecipe from "./json/Recipe";
import JSONSellPoint from "./json/SellPoint";
import JSONWorld from "./json/World";
import { Function } from "./Networker";
import Registry from "./Registry";

export class Item {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly tags: string[];

	constructor(core: JSONItem) {
		this.id = core.id;
		this.name = core.name;
		this.description = core.description;
		this.tags = core.tags;
	}
}

export class Recipe {
	readonly id: string;
	readonly type: string;
	readonly inputs: Map<string, number>;
	readonly outputs: Map<string, number>;

	constructor(core: JSONRecipe) {
		this.id = core.id;
		this.type = core.type;
		this.inputs = core.inputs;
		this.outputs = core.outputs;
	}
}

export class SellPoint {
	readonly id: string;
	readonly item: string;
	readonly value: number;
	readonly name: string;

	GetInstance(): Instance {
		return game.Workspace.WaitForChild("Sell Points").WaitForChild(this.name);
	}

	constructor(core: JSONSellPoint) {
		this.id = core.id;
		this.item = core.item;
		this.value = core.value;
		this.name = core.name;
	}
}
const RunService = game.GetService("RunService");
const HttpService = game.GetService("HttpService");
const GetWorldFunction: Function<[string], [JSONWorld], [], []> = Function.GetFunction("build.data.world");

export default class World {
	static fileurl = "file:///home/paul/Documents/RobloxProjects/TypeScriptFactory/world.json";

	static Import(data: string | JSONWorld) {
		if (typeIs(data, "string")) {
			const world = RunService.IsServer()
				? (HttpService.JSONDecode(HttpService.GetAsync(data)) as JSONWorld)
				: GetWorldFunction.FireServer(data)[0];

			this.Import(world);
		} else {
			data.items.map((core) => Registry.AddItem(new Item(core)));
			data.recipies.map((core) => Registry.AddRecipe(new Recipe(core)));
		}
	}
}

if (RunService.IsServer()) {
	GetWorldFunction.OnServerInvoke((_, data) => [HttpService.JSONDecode(HttpService.GetAsync(data)) as JSONWorld]);
}
