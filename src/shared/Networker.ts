//#region Setup
import { SuccessCase, ValueSuccessCase } from "./SuccessCase";

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
 * Represents arguments.
 */
type Arguments<T> = T extends readonly unknown[] ? T : [T];
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
type ClientEventCallback<I extends unknown[]> = (...args: I) => undefined | void;
/**
 * Represents a server's callback for an event.
 */
type ServerEventCallback<I extends unknown[]> = (player: Player, ...args: I) => undefined | void;
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
 * @deprecated Use EventV2.
 */
export class Event<ClientToServer extends unknown[], ServerToClient extends unknown[]> {
	readonly remoteEvent: RemoteEvent;

	/**
	 * Fire the event to the server.
	 * @param args The arguments to pass to the server.
	 */
	FireServer(...args: ClientToServer) {
		if (!isClient) {
			error("Can only link to client as the client", 2);
		}
		this.remoteEvent.FireServer(...args);
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
		this.remoteEvent.FireClient(player, ...args);
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
		const connection = this.remoteEvent.OnClientEvent.Connect(callback);
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
			this.remoteEvent.OnServerEvent as unknown as RBXScriptSignal<ServerEventCallback<ClientToServer>>
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
			const xEvent = RouterFolder.FindFirstChild(`E.${token}`) as RemoteEvent | undefined;
			if (xEvent === undefined) {
				tEvent = new Instance("RemoteEvent", RouterFolder);
				tEvent.Name = `E.${token}`;
			} else {
				tEvent = xEvent;
			}
		} else {
			tEvent = RouterFolder.WaitForChild(`E.${token}`) as RemoteEvent;
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
		this.remoteEvent = event;
	}
}

/**
 * Wraps a RemoteFunction, to allow Server -> Client -> Server and Client -> Server -> Client communication.
 * @deprecated Use FunctionV2.
 */
export class Function<
	ClientToServer extends unknown[],
	ServerBackToClient extends unknown[],
	ServerToClient extends unknown[],
	ClientBackToServer extends unknown[],
> {
	readonly remoteFunction: RemoteFunction;

	/**
	 * Invoke the function on the server.
	 * @param args The data to pass to the server.
	 * @returns The data passed from the server.
	 */
	FireServer(...args: ClientToServer): ServerBackToClient {
		if (!isClient) {
			error("Can only link to client as the client", 2);
		}
		return this.remoteFunction.InvokeServer(...args);
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
		return this.remoteFunction.InvokeClient(player, ...args) as unknown as ClientBackToServer;
	}

	/**
	 * Handles when the server invokes the client.
	 * @param callback The callback to run.
	 */
	OnClientInvoke(callback: ClientFunctionCallback<ServerToClient, ClientBackToServer>) {
		if (!isClient) {
			error("Can only link to client as the client", 2);
		}
		this.remoteFunction.OnClientInvoke = callback;
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
		this.remoteFunction.OnServerInvoke = callback as unknown as
			| ((player: Player, ...args: Array<unknown>) => void)
			| undefined;
	}

	static readonly RequestNewEventFunction: Function<[string], [RemoteEvent], [], []> = new Function(
		"core.requestnew.event",
	);
	static readonly RequestNewFunctionFunction: Function<[string], [RemoteFunction], [], []> = new Function(
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
			const existing = RouterFolder.FindFirstChild(`F.${token}`) as RemoteFunction | undefined;
			if (existing) {
				rf = existing;
			} else {
				rf = new Instance("RemoteFunction", RouterFolder) as RemoteFunction;
				rf.Name = `F.${token}`;
			}
		} else {
			rf = RouterFolder.WaitForChild(`F.${token}`) as RemoteFunction;
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
			const remoteFunction = this.RequestNewFunctionFunction.FireServer(token)[0];
			return new Function<CTS, SBC, STC, CBS>(remoteFunction);
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
			this.remoteFunction = tFunc;
		} else {
			this.remoteFunction = tokenOrFunction as RemoteFunction;
		}
	}
}

/**
 * NetworkerV2 |
 * Wraps a RemoteEvent, and provides type safety with cross-boundary communication.
 */
export class EventV2<ClientToServer, ServerToClient> {
	private readonly remote: RemoteEvent;

	/**
	 * Fires the event for the server.
	 * @param args The data to pass to the server.
	 */
	FireServer(...args: Arguments<ClientToServer>) {
		this.remote.FireServer(args);
	}

	/**
	 *	Fires the event for a client.
	 * @param client The client to fire the event for.
	 * @param args The data to pass to the client.
	 */
	FireClient(client: Player, ...args: Arguments<ServerToClient>) {
		this.remote.FireClient(client, args);
	}

	/**
	 * Detects when the server fires the client.
	 * @param callback The function that handles the data.
	 * @returns An unlinker to disconnect the callback.
	 */
	OnClientFired(callback: (...args: Arguments<ServerToClient>) => void): () => void {
		const connection = this.remote.OnClientEvent.Connect(callback as (...args: unknown[]) => void);
		return () => connection.Disconnect();
	}

	/**
	 * Detects when the client fires the server.
	 * @param callback The function that handles the data.
	 * @returns An unlinker to disconnect the callback.
	 */
	OnServerFired(callback: (client: Player, ...args: Arguments<ClientToServer>) => void): () => void {
		const connection = this.remote.OnServerEvent.Connect(callback as (client: Player, ...args: unknown[]) => void);
		return () => connection.Disconnect();
	}

	private static BuildOrWaitFor<CS, SC>(token: string) {
		if (isServer) {
			let remote = RouterFolder.FindFirstChild(`Function ${token}`) as RemoteEvent | undefined;
			if (remote === undefined) {
				const created = new Instance("RemoteEvent", RouterFolder);
				created.Name = `Function ${token}`;
				remote = created;
			}
			return new EventV2<CS, SC>(remote);
		} else {
			return new EventV2<CS, SC>(RouterFolder.WaitForChild(`Function ${token}`) as RemoteEvent);
		}
	}

	static Get<CS, SC>(token: string): EventV2<CS, SC> {
		if (isServer) {
			return this.BuildOrWaitFor(token);
		} else {
			return new EventV2<CS, SC>(FunctionV2.BuildEventConnector.InvokeServer(token));
		}
	}

	private constructor(remote: RemoteEvent) {
		this.remote = remote;
	}
}

/**
 * NetworkerV2 |
 * Wraps a RemoteFunction, and provides type safety with cross-boundary communication.
 */
export class FunctionV2<ClientCall, ServerReturn, ServerCall, ClientReturn> {
	private readonly remote: RemoteFunction;

	/**
	 * Invokes the server's callback.
	 * @param args The data to pass to the server.
	 * @returns The data returned from the server.
	 */
	InvokeServer(...args: Arguments<ClientCall>): ServerReturn {
		return this.remote.InvokeServer(...args) as unknown as ServerReturn;
	}

	/**
	 * Invokes the client's callback.
	 * @param client The target client.
	 * @param args The data to pass to the client.
	 * @returns The data returned from the client.
	 */
	InvokeClient(client: Player, ...args: Arguments<ServerCall>): ClientReturn {
		return this.remote.InvokeClient(client, ...args) as unknown as ClientReturn;
	}

	/**
	 * Set's the server's callback.
	 * @param callback The callback.
	 */
	SetServerCallback(callback: (client: Player, ...args: Arguments<ClientCall>) => ServerReturn) {
		this.remote.OnServerInvoke = callback as (client: Player, ...args: unknown[]) => ServerReturn;
	}

	/**
	 * Set's the client's callback.
	 * @param callback The callback.
	 */
	SetClientCallbak(callback: (...args: Arguments<ServerCall>) => ClientReturn) {
		this.remote.OnClientInvoke = callback as (...args: unknown[]) => ClientReturn;
	}

	/** The FunctionV2 used for when a client wants an EventV2 to be built. */
	static readonly BuildEventConnector: FunctionV2<string, RemoteEvent, undefined, undefined> =
		this.BuildOrWaitFor("Build Event");
	/** The FunctionV2 used for when a client wants a FunctionV2 to be built. */
	static readonly BuildFunctionConnector: FunctionV2<string, RemoteFunction, undefined, undefined> =
		this.BuildOrWaitFor("Build Function");

	private static BuildOrWaitFor<CC, SR, SC, CR>(token: string) {
		if (isServer) {
			let remote = RouterFolder.FindFirstChild(`Function ${token}`) as RemoteFunction | undefined;
			if (remote === undefined) {
				const created = new Instance("RemoteFunction", RouterFolder);
				created.Name = `Function ${token}`;
				remote = created;
			}
			return new FunctionV2<CC, SR, SC, CR>(remote);
		} else {
			return new FunctionV2<CC, SR, SC, CR>(RouterFolder.WaitForChild(`Function ${token}`) as RemoteFunction);
		}
	}

	static Get<CC, SR, SC, CR>(token: string): FunctionV2<CC, SR, SC, CR> {
		if (isServer) {
			return this.BuildOrWaitFor(token);
		} else {
			return new FunctionV2<CC, SR, SC, CR>(this.BuildFunctionConnector.InvokeServer(token));
		}
	}

	private constructor(remote: RemoteFunction) {
		this.remote = remote;
	}
}

/*
 * ✅ Server -> Client
 * ✅ Server -> Client -> Server
 * ✅ Client -> Server
 * ✅ Client -> Server -> Client
 * ❎ S/C A -> S/C B
 * ❎ S/C A -> S/C B -> S/C A
 */

if (isServer) {
	Function.RequestNewFunctionFunction.OnServerInvoke((player, token) => {
		return [Function.GetFunction(token).remoteFunction];
	});
	Function.RequestNewEventFunction.OnServerInvoke((player, token) => {
		return [Event.GetEvent(token).remoteEvent];
	});
}
