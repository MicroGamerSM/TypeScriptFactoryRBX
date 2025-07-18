import JSONItem from "./json/item";

export class Item {
	id: string;
	name: string;
	description: string;
	tags: string[];

	constructor(core: JSONItem) {
		this.id = core.id;
		this.name = core.name;
		this.description = core.description;
		this.tags = core.tags;
	}
}

export default class World {}
