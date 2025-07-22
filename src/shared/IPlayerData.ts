import ToolType from "./ToolType";

export default interface IPlayerData {
	money: number;
	axeTool: ToolType;
	axeLostDurability: number;
	pickaxeTool: ToolType;
	pickaxeLostDurability: number;
	shovelTool: ToolType;
	shovelLostDurability: number;
}
