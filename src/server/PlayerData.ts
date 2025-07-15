import ProfileStore, { Profile } from "@rbxts/profile-store";
import { BuildDefaultPlayerData, IPlayerData, PlayerDetails } from "shared/Classes";
import { Event, Function } from "shared/Networker";
// import Router from "shared/Router";

const RunService = game.GetService("RunService");
const DataStore = RunService.IsStudio() ? "Development" : "Production";

const Players = game.GetService("Players");

const store = ProfileStore.New<IPlayerData>(DataStore, BuildDefaultPlayerData());

export const profiles: Map<Player, Profile<IPlayerData, object>> = new Map();
export const data: Map<number, PlayerDetails> = new Map();

const NotifyEvent: Event<[], [string, string?]> = Event.GetEvent("notify");

const RequestUpdateFunction: Function<[], [number], [], []> = Function.GetFunction("update.money");

function setupPlayer(player: Player) {
	task.spawn(() => {
		const profile = store.StartSessionAsync(`Pds${player.UserId}`, {
			Cancel: () => player.Parent === undefined,
		});

		if (!profile) {
			player.Kick("Could not load data. Try again later.");
			return;
		}

		profile.Reconcile();

		// Optionally react to saves or network events:
		profile.OnSave.Connect(() => {
			print(`Saved data for ${player.DisplayName}`);
			NotifyEvent.FireClient(player, "Your data has been auto-saved.");
		});

		// When player leaves:
		player.AncestryChanged.Connect((_, parent) => {
			if (!parent) {
				profile.EndSession(); // flush and release
				profiles.delete(player);
				data.delete(player.UserId);
			}
		});

		const Leaderstats = new Instance("Folder", player);
		Leaderstats.Name = "leaderstats";

		const MoneyValue = new Instance("NumberValue", Leaderstats);
		MoneyValue.Name = "Money";
		MoneyValue.Value = profile.Data.money;

		const pd = new PlayerDetails(profile, player);

		pd.Changed((key, oldValue, newValue) => {
			if (key === "money") {
				MoneyValue.Value = newValue;
			}
		});

		profiles.set(player, profile);
		data.set(player.UserId, pd);
	});
}

Players.PlayerAdded.Connect((player) => {
	setupPlayer(player);
});

RequestUpdateFunction.OnServerInvoke((player) => {
	const Details = data.get(player.UserId);
	if (Details === undefined) {
		warn(`Failed to get details for ${player.DisplayName}!`);
		return [34401];
	}
	const values: [number] = [Details.money];
	return values;
});

Players.GetPlayers().forEach(setupPlayer);
