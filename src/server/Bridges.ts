import { PlayerDetails } from "shared/Classes";
import { Bridge } from "shared/Networker";

export const GetPlayerDetailsBridge: Bridge<Player, PlayerDetails | false> = Bridge.Get("Get Player Details");
