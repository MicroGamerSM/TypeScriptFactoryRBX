import JSONItem from "./Item";
import JSONRecipe from "./Recipe";
import JSONSellPoint from "./SellPoint";

export default interface JSONWorld {
	items: JSONItem[];
	recipies: JSONRecipe[];

	sellPoints: JSONSellPoint[];
}
