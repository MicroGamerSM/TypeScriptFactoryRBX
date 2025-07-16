export default interface JSONRecipe {
	type: string;
	inputs: Map<string, number>;
	outputs: Map<string, number>;
}
