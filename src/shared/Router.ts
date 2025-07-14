//#region Setup
import { SuccessCase, ValueSuccessCase } from "./Classes";

const ReplicatedStorage = game.GetService("ReplicatedStorage");
const RunService = game.GetService("RunService");

const isServer = RunService.IsServer();
const isClient = RunService.IsClient();

let RouterFolder: Folder;
if (isClient) {
	RouterFolder = ReplicatedStorage.WaitForChild("Router") as Folder;
} else if (isServer) {
	let tRouterFolder = ReplicatedStorage.FindFirstChild("Router") as Folder | undefined;
	if (tRouterFolder === undefined) {
		tRouterFolder = new Instance("Folder", ReplicatedStorage);
	}
	RouterFolder = tRouterFolder;
}
//#endregion

/**
 * Routes messages between scripts.
 */
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

type ClientFunctionCallback<I extends unknown[], O extends unknown[]> = (...args: I) => O;
type ServerFunctionCallback<I extends unknown[], O extends unknown[]> = (player: Player, ...args: I) => O;

/**
 * Wraps a RemoteEvent, to allow Server -> Client and Client -> Server communication.
 */
class Event<ClientToServer extends unknown[], ServerToClient extends unknown[]> {
	private readonly event: RemoteEvent;

	/**
	 * Fire the event to the server.
	 * @param args The arguments to pass to the server.
	 */
	FireServer(...args: ClientToServer) {
		this.event.FireServer(args);
	}

	/**
	 * Fire the event to a client.
	 * @param player The client to trigger the event for.
	 * @param args The arguments to pass to the client.
	 */
	FireClient(player: Player, ...args: ServerToClient) {
		this.event.FireClient(player, args);
	}

	/**
	 * Handles when the server sends a message to the current client.
	 * @param callback The function to call.
	 * @returns An unlinker to disconnect the callback.
	 */
	OnClientInvoke(callback: ClientEventCallback<ServerToClient>): Unlinker {
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

	/**
	 * Handles when a client sends a message to the server.
	 * @param callback The function to call.
	 * @returns An unlinker to disconnect the callback.
	 */
	OnServerInvoke(callback: ServerEventCallback<ClientToServer>) {
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
			const xEvent = RouterFolder.FindFirstChild(token) as RemoteEvent | undefined;
			if (xEvent === undefined) {
				tEvent = new Instance("RemoteEvent", RouterFolder);
				tEvent.Name = token;
			} else {
				tEvent = xEvent;
			}
		} else {
			tEvent = RouterFolder.WaitForChild(token) as RemoteEvent;
		}
		this.event = tEvent;
	}
}

class Function<
	ClientToServer extends unknown[],
	ServerBackToClient extends unknown[],
	ServerToClient extends unknown[],
	ClientBackToServer extends unknown[],
> {
	private readonly func: RemoteFunction;

	FireServer(...args: ClientToServer): ServerBackToClient {
		return this.func.InvokeServer(args);
	}

	FireClient(player: Player, ...args: ServerToClient): ClientBackToServer {
		return this.func.InvokeClient(player, args) as unknown as ClientBackToServer;
	}

	OnClientInvoke(callback: ClientFunctionCallback<ServerToClient, ClientBackToServer>) {
		this.func.OnClientInvoke = callback;
	}

	OnServerInvoke(callback: ServerFunctionCallback<ClientToServer, ServerBackToClient>) {
		// fuck you type safety
		this.func.OnServerInvoke = callback as unknown as
			| ((player: Player, ...args: Array<unknown>) => void)
			| undefined;
	}

	constructor(token: string) {
		let tFunc: RemoteFunction;

		if (isServer) {
			const xFunc = RouterFolder.FindFirstChild(token) as RemoteFunction | undefined;
			if (xFunc === undefined) {
				tFunc = new Instance("RemoteFunction", RouterFolder);
				tFunc.Name = token;
			} else {
				tFunc = xFunc;
			}
		} else {
			tFunc = RouterFolder.WaitForChild(token) as RemoteFunction;
		}
		this.func = tFunc;
	}
}

/*
 * ✅Server -> Client
 * ✅Server -> Client -> Server
 * ✅Client -> Server
 * ✅Client -> Server -> Client
 * ❎S/C A -> S/C B
 * ❎S/C A -> S/C B -> S/C A
 */
