import JSONItem from "./json/Item";
import JSONRecipe from "./json/Recipe";

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

export default class World {}
