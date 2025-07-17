import JSONItem from "./item";
import JSONRecipe from "./recipe";
import JSONSellPoint from "./sellPoint";

export default interface JSONWorld {
	items: JSONItem[];
	recipies: JSONRecipe[];

	sellPoints: JSONSellPoint[];
}
