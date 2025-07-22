import { Profile } from "@rbxts/profile-store";
import IPlayerData from "./IPlayerData";
import Observable from "./Observable";
import ToolType from "./ToolType";
import { EventV2 } from "./Networker";

const MoneyUpdatedEvent: EventV2<void, number> = EventV2.Get("Update Money");

export default class PlayerDetails extends Observable<IPlayerData> implements IPlayerData {
	money: number;
	axeTool: ToolType;
	axeLostDurability: number;
	pickaxeTool: ToolType;
	pickaxeLostDurability: number;
	shovelTool: ToolType;
	shovelLostDurability: number;

	static BuildDefault(): IPlayerData {
		return {
			money: 100,
			axeTool: ToolType.Wood,
			axeLostDurability: 0,
			pickaxeTool: ToolType.None,
			pickaxeLostDurability: 0,
			shovelTool: ToolType.None,
			shovelLostDurability: 0,
		};
	}

	constructor(source: Profile<IPlayerData, object>, player: Player) {
		super(source.Data);
		this.money = source.Data.money;
		this.axeTool = source.Data.axeTool;
		this.axeLostDurability = source.Data.axeLostDurability;
		this.pickaxeTool = source.Data.pickaxeTool;
		this.pickaxeLostDurability = source.Data.pickaxeLostDurability;
		this.shovelTool = source.Data.shovelTool;
		this.shovelLostDurability = source.Data.shovelLostDurability;

		if (game.GetService("RunService").IsClient())
			error(
				"Cannot create PlayerDetails on client. Ask the server for a readonly reference (FunctionV2 Get Player Details).",
				2,
			);

		this.Changed((key, oldV, newV) => {
			if (source.IsActive()) source.Data[key] = newV;
			else warn("Using PlayerDetails after Profile is disabled!");

			if (key === "money") {
				MoneyUpdatedEvent.FireClient(player, this.money);
			}
		});
	}
}
