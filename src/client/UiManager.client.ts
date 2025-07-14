import { Function } from "shared/Networker";

const RunService = game.GetService("RunService");

const GetMoneyFunction: Function<[], [number], [], []> = Function.GetFunction("update.money");
