import { Bridge } from "shared/Networker";
import PlayerDetails from "shared/PlayerDetails";

export const GetPlayerDetailsBridge: Bridge<Player, PlayerDetails | undefined> = Bridge.Get("Get Player Details");
