export default interface JSONRecipe {
	id: string;
	type: string;
	inputs: Map<string, number>;
	outputs: Map<string, number>;
}
