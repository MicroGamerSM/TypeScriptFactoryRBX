import ProfileStore from "@rbxts/profile-store";
import { PlayerData, ToolType } from "shared/Classes";
import Network from "shared/Networker";

const Players = game.GetService("Players");

const store = ProfileStore.New<PlayerData>("PlayerData", {
	Money: 100,
	AxeTool: ToolType.Wood,
	ShovelTool: ToolType.None,
	PickaxeTool: ToolType.None,
});

Players.PlayerAdded.Connect((player) => {
	task.spawn(() => {
		const profile = store.StartSessionAsync(`Pds${player.UserId}`, {
			Cancel: () => player.Parent === undefined,
		});

		if (!profile) {
			player.Kick("Could not load data. Try again later.");
			return;
		}

		// Optionally react to saves or network events:
		profile.OnSave.Connect(() => {
			print(`Saved data for ${player.DisplayName}`);
			Network.SendToClient("datastore.saved", player);
			Network.SendToClient("notification", player, "Your data has been auto-saved.");
		});

		// When player leaves:
		player.AncestryChanged.Connect((_, parent) => {
			if (!parent) {
				profile.EndSession(); // flush and release
			}
		});
	});
});
