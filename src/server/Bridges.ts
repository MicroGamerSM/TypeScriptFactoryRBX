import { PlayerDetails } from "shared/Classes";
import { Bridge } from "shared/Networker";

export const GetPlayerDetailsBridge: Bridge<Player, PlayerDetails | undefined> = Bridge.Get("Get Player Details");
