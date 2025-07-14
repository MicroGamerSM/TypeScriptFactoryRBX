//#region Setup
import { SuccessCase, ValueSuccessCase } from "./Classes";

const ReplicatedStorage = game.GetService("ReplicatedStorage");
const RunService = game.GetService("RunService");

const isServer = RunService.IsServer();
const isClient = RunService.IsClient();

let RouterFolder: Folder;
let RemoteFunctions: Folder;
if (isClient) {
	RouterFolder = ReplicatedStorage.WaitForChild("Router") as Folder;
} else if (isServer) {
	let tRouterFolder = ReplicatedStorage.FindFirstChild("Router") as Folder | undefined;
	if (tRouterFolder === undefined) {
		tRouterFolder = new Instance("Folder", ReplicatedStorage);
		RemoteFunctions = new Instance("Folder", tRouterFolder);
	}
	RouterFolder = tRouterFolder;
}
//#endregion

/**
 * Routes messages between scripts.
 */
class Router {
	static RequestFromServer(type: string, ...args: unknown[]): ValueSuccessCase<unknown[] | undefined> {
		const event: RemoteFunction | undefined = RemoteFunctions.FindFirstChild(type) as RemoteFunction | undefined;
		if (event === undefined) {
			return ValueSuccessCase.Fail(`No C->S->C of type ${type} was found`, undefined);
		}
		return ValueSuccessCase.Ok("Got data from server.", event.InvokeServer(...args));
	}
}

/**
 * Represents a function to unlink an event.
 */
type Unlinker<> = () => SuccessCase;

/**
 * Represents a callback for an event.
 */
type EventCallback<I extends unknown[]> = (...args: I) => undefined;

class Eventer<I extends unknown[], O extends unknown[]> {
	private readonly event: RemoteEvent;

	Fire(...args: I) {

	}

	OnClient(callback: EventCallback<I>) {
		if (!isClient) {
			error("Can only link to client as the client", 2);
		}
		this.event.OnClientEvent.Connect(callback);
	}

	constructor(token: string) {
		let tEvent: RemoteEvent;

		if (isServer) {
			const xEvent = ReplicatedStorage.FindFirstChild(token) as RemoteEvent | undefined;
			if (xEvent === undefined) {
				tEvent = new Instance("RemoteEvent", ReplicatedStorage);
				tEvent.Name = token;
			} else {
				tEvent = xEvent;
			}
		} else {
			tEvent = ReplicatedStorage.WaitForChild(token) as RemoteEvent;
		}
		this.event = tEvent;
	}
}

export default Router;
/*
 * Server -> Client
 * Server -> Client -> Server
 * Client -> Server
 * Client -> Server -> Client
 * S/C A -> S/C B
 * S/C A -> S/C B -> S/C A
 */
