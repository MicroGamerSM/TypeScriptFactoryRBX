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
	static RequestFromServer(token: string, ...args: unknown[]): ValueSuccessCase<unknown[] | undefined> {
		const event: RemoteFunction | undefined = RemoteFunctions.FindFirstChild(token) as RemoteFunction | undefined;
		if (event === undefined) {
			return ValueSuccessCase.Fail(`No C->S->C of type ${token} was found`, undefined);
		}
		return ValueSuccessCase.Ok("Got data from server.", event.InvokeServer(...args));
	}
}

/**
 * Represents a function to unlink an event.
 */
type Unlinker = () => SuccessCase;

/**
 * Represents a client's callback for an event.
 */
type ClientEventCallback<I extends unknown[]> = (...args: I) => undefined;
/**
 * Represents a server's callback for an event.
 */
type ServerEventCallback<I extends unknown[]> = (player: Player, ...args: I) => undefined;

class Eventer<ClientToServer extends unknown[], ServerToClient extends unknown[]> {
	private readonly event: RemoteEvent;

	FireServer(...args: ClientToServer) {
		this.event.FireServer(args);
	}

	FireClient(player: Player, ...args: ServerToClient) {
		this.event.FireClient(player, args);
	}

	OnClient(callback: ClientEventCallback<ServerToClient>): Unlinker {
		if (!isClient) {
			error("Can only link to client as the client", 2);
		}
		const connection = this.event.OnClientEvent.Connect(callback);
		return () => {
			if (!connection.Connected) {
				return SuccessCase.Fail("Already unlinked");
			}
			connection.Disconnect();
			return SuccessCase.Ok("Unlinked");
		};
	}

	OnServer(callback: ServerEventCallback<ClientToServer>) {
		if (!isServer) {
			error("Can only link to server as the server", 2);
		}

		const connection = (
			this.event.OnServerEvent as unknown as RBXScriptSignal<ServerEventCallback<ClientToServer>>
		).Connect(callback);
		return () => {
			if (!connection.Connected) {
				return SuccessCase.Fail("Already unlinked");
			}
			connection.Disconnect();
			return SuccessCase.Ok("Unlinked");
		};
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
