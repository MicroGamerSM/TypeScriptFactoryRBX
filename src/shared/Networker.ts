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

//#region Helper Types
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
/**
 * Represents a client's callback for a function.
 */
type ClientFunctionCallback<I extends unknown[], O extends unknown[]> = (...args: I) => O;
/**
 * Represents a server's callback for a function.
 */
type ServerFunctionCallback<I extends unknown[], O extends unknown[]> = (player: Player, ...args: I) => O;
//#endregion

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
		if (!isClient) {
			error("Can only link to client as the client", 2);
		}
		this.event.FireServer(args);
	}

	/**
	 * Fire the event to a client.
	 * @param player The client to trigger the event for.
	 * @param args The arguments to pass to the client.
	 */
	FireClient(player: Player, ...args: ServerToClient) {
		if (!isServer) {
			error("Can only link to server as the server", 2);
		}
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

	/**
	 * On the server, attempts to find the requested event, and builds one if that fails.
	 * On the client, waits for the server to build the event if it cannot find it.
	 * @param token The target event.
	 * @returns The event object.
	 */
	static BuildOrWaitFor<I extends unknown[], O extends unknown[]>(token: string): Event<I, O> {
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
		return new Event(tEvent);
	}

	/**
	 * On the server, functions the same as BuildOrWaitFor().
	 * On the client, asks the server to build the event or find the event.
	 * @param token The target event.
	 * @returns The event object.
	 */
	static GetEvent<I extends unknown[], O extends unknown[]>(token: string) {
		if (isServer) {
			return this.BuildOrWaitFor<I, O>(token);
		}
		return new Event<I, O>(Function.RequestNewEventFunction.FireServer(token)[0]);
	}

	private constructor(event: RemoteEvent) {
		this.event = event;
	}
}

/**
 * Wraps a RemoteFunction, to allow Server -> Client -> Server and Client -> Server -> Client communication.
 */
class Function<
	ClientToServer extends unknown[],
	ServerBackToClient extends unknown[],
	ServerToClient extends unknown[],
	ClientBackToServer extends unknown[],
> {
	private readonly func: RemoteFunction;

	/**
	 * Invoke the function on the server.
	 * @param args The data to pass to the server.
	 * @returns The data passed from the server.
	 */
	FireServer(...args: ClientToServer): ServerBackToClient {
		if (!isClient) {
			error("Can only link to client as the client", 2);
		}
		return this.func.InvokeServer(args);
	}

	/**
	 * Invoke the function on a client.
	 * @param player The client in question.
	 * @param args The data to pass to the client.
	 * @returns The data passed from the client.
	 */
	FireClient(player: Player, ...args: ServerToClient): ClientBackToServer {
		if (!isServer) {
			error("Can only link to server as the server", 2);
		}
		return this.func.InvokeClient(player, args) as unknown as ClientBackToServer;
	}

	/**
	 * Handles when the server invokes the client.
	 * @param callback The callback to run.
	 */
	OnClientInvoke(callback: ClientFunctionCallback<ServerToClient, ClientBackToServer>) {
		if (!isClient) {
			error("Can only link to client as the client", 2);
		}
		this.func.OnClientInvoke = callback;
	}

	/**
	 * Handles when a client invokes the serrver.
	 * @param callback The callback to run.
	 */
	OnServerInvoke(callback: ServerFunctionCallback<ClientToServer, ServerBackToClient>) {
		if (!isServer) {
			error("Can only link to server as the server", 2);
		}
		// fuck you type safety
		this.func.OnServerInvoke = callback as unknown as
			| ((player: Player, ...args: Array<unknown>) => void)
			| undefined;
	}

	static readonly RequestNewEventFunction: Function<[string], [RemoteEvent], [], []> = new Function(
		"core.requestnew.event",
	);
	static readonly RequestNewFunctionFunction: Function<[string], [RemoteEvent], [], []> = new Function(
		"core.requestnew.function",
	);

	/**
	 * On the server, attempts to find the requested function, and builds one if that fails.
	 * On the client, waits for the server to build the function if it cannot find it.
	 * @param token The target function.
	 * @returns The function object.
	 */
	static BuildOrWaitFor<CTS extends unknown[], SBC extends unknown[], STC extends unknown[], CBS extends unknown[]>(
		token: string,
	): Function<CTS, SBC, STC, CBS> {
		let rf: RemoteFunction;

		if (isServer) {
			const existing = RouterFolder.FindFirstChild(token) as RemoteFunction | undefined;
			if (existing) {
				rf = existing;
			} else {
				rf = new Instance("RemoteFunction", RouterFolder) as RemoteFunction;
				rf.Name = token;
			}
		} else {
			rf = RouterFolder.WaitForChild(token) as RemoteFunction;
		}

		// we need a private constructor that accepts an existing RemoteFunction
		return new Function<CTS, SBC, STC, CBS>(rf);
	}

	/**
	 * On the server, functions the same as BuildOrWaitFor().
	 * On the client, asks the server to build the event or find the function.
	 * @param token The target function.
	 * @returns The function object.
	 */
	static GetFunction<CTS extends unknown[], SBC extends unknown[], STC extends unknown[], CBS extends unknown[]>(
		token: string,
	): Function<CTS, SBC, STC, CBS> {
		if (isServer) {
			return this.BuildOrWaitFor<CTS, SBC, STC, CBS>(token);
		} else {
			// ask the server to create/find it, then grab the RemoteFunction it returns
			const [remoteFunction] = this.RequestNewFunctionFunction.FireServer(token);
			return new Function<CTS, SBC, STC, CBS>(remoteFunction.Name);
		}
	}

	private constructor(tokenOrFunction: string | RemoteFunction) {
		if (typeOf(tokenOrFunction) === "string") {
			let tFunc: RemoteFunction;

			if (isServer) {
				const xFunc = RouterFolder.FindFirstChild(tokenOrFunction as string) as RemoteFunction | undefined;
				if (xFunc === undefined) {
					tFunc = new Instance("RemoteFunction", RouterFolder);
					tFunc.Name = tokenOrFunction as string;
				} else {
					tFunc = xFunc;
				}
			} else {
				tFunc = RouterFolder.WaitForChild(tokenOrFunction as string) as RemoteFunction;
			}
			this.func = tFunc;
		} else {
			this.func = tokenOrFunction as RemoteFunction;
		}
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
