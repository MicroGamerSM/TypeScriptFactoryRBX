import ProfileStore, { Profile } from "@rbxts/profile-store";
import { BuildDefaultPlayerData, IPlayerData } from "shared/Classes";
import Router from "shared/Router";

const RunService = game.GetService("RunService");
const DataStore = RunService.IsStudio() ? "Development" : "Production";

const Players = game.GetService("Players");

const store = ProfileStore.New<IPlayerData>(DataStore, BuildDefaultPlayerData());

const profiles: Map<Player, Profile<IPlayerData, object>> = new Map();

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
			Router.SendToClient("datastore.saved", player);
			Router.SendToClient("notification", player, "Your data has been auto-saved.");
		});

		// When player leaves:
		player.AncestryChanged.Connect((_, parent) => {
			if (!parent) {
				profile.EndSession(); // flush and release
				profiles.delete(player);
			}
		});

		profiles.set(player, profile);
	});
});

export default profiles;
