import ProfileStore, { Profile } from "@rbxts/profile-store";
import { BuildDefaultPlayerData, IPlayerData, PlayerDetails } from "shared/Classes";
import { EventV2, FunctionV2 } from "shared/Networker";
import { GetPlayerDetailsBridge } from "./Bridges";
// import Router from "shared/Router";

const RunService = game.GetService("RunService");
const DataStore = RunService.IsStudio() ? "Development" : "Production";

const Players = game.GetService("Players");

const store = ProfileStore.New<IPlayerData>(DataStore, BuildDefaultPlayerData());

const profiles: Map<Player, Profile<IPlayerData, object>> = new Map();
const data: Map<number, PlayerDetails> = new Map();

const NotifyEvent: EventV2<undefined, [string, string?]> = EventV2.Get("Notification");

const RequestUpdateFunction: FunctionV2<undefined, PlayerDetails, undefined, undefined> =
	FunctionV2.Get("Get Player Details");

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

function GetPlayerData(player: Player): PlayerDetails {
	function core(ind: number): PlayerDetails {
		if (ind === 0) {
			error("Exited GPD loop!");
		}
		return (
			data.get(player.UserId) ??
			(() => {
				warn(`GPD loop index ${ind} failed to fetch player data.`);
				wait(1);
				ind = ind - 1;
				return core(ind);
			})()
		);
	}

	return core(25);
}

RequestUpdateFunction.SetServerCallback(GetPlayerData);

Players.GetPlayers().forEach(setupPlayer);

//#region Bridges

GetPlayerDetailsBridge.SetCrossCallback((player: Player) => data.get(player.UserId));
//#endregion
