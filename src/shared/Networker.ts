const ReplicatedStorage = game.GetService("ReplicatedStorage");
const RunService = game.GetService("RunService");

type Callback<T extends unknown[] = unknown[], R = void> = (...args: T) => R;

const isServer = RunService.IsServer();
const isClient = RunService.IsClient();

// RemoteEvent / RemoteFunction parent location
let COMM_FOLDER: Folder;
if (isServer) {
	COMM_FOLDER = new Instance("Folder");
	COMM_FOLDER.Name = "__COMM__";
	COMM_FOLDER.Parent = ReplicatedStorage;
} else {
	// On the client, just wait for the server’s folder to exist:
	COMM_FOLDER = ReplicatedStorage.WaitForChild("__COMM__") as Folder;
}

// Cache
const Events = new Map<string, RemoteEvent>();
const Functions = new Map<string, RemoteFunction>();

function getOrCreateEvent(name: string): RemoteEvent {
	let event = Events.get(name);
	if (!event) {
		event = (COMM_FOLDER.FindFirstChild(name) as RemoteEvent) ?? new Instance("RemoteEvent");
		event.Name = name;
		event.Parent = COMM_FOLDER;
		Events.set(name, event);
	}
	return event;
}

function getOrCreateFunction(name: string): RemoteFunction {
	let func = Functions.get(name);
	if (!func) {
		func = (COMM_FOLDER.FindFirstChild(name) as RemoteFunction) ?? new Instance("RemoteFunction");
		func.Name = name;
		func.Parent = COMM_FOLDER;
		Functions.set(name, func);
	}
	return func;
}

// Bindable for server-server
const Bindables = new Map<string, BindableEvent>();
function getOrCreateBindable(name: string): BindableEvent {
	let bind = Bindables.get(name);
	if (!bind) {
		bind = new Instance("BindableEvent");
		bind.Name = name;
		Bindables.set(name, bind);
	}
	return bind;
}

namespace Network {
	// Server -> Client
	export function SendToClient(name: string, player: Player, ...args: unknown[]) {
		const event = getOrCreateEvent(name);
		event.FireClient(player, ...args);
	}

	// Client -> Server
	export function SendToServer(name: string, ...args: unknown[]) {
		const event = getOrCreateEvent(name);
		event.FireServer(...args);
	}

	// Server -> All Clients
	export function Broadcast(name: string, ...args: unknown[]) {
		const event = getOrCreateEvent(name);
		event.FireAllClients(...args);
	}

	// On Server Receive from Client
	export function OnServerReceive(name: string, handler: (player: Player, ...args: unknown[]) => void) {
		if (!isServer) return;
		const event = getOrCreateEvent(name);
		event.OnServerEvent.Connect(handler);
	}

	// On Client Receive from Server
	export function OnClientReceive(name: string, handler: (...args: unknown[]) => void) {
		if (!isClient) return;
		const event = getOrCreateEvent(name);
		event.OnClientEvent.Connect(handler);
	}

	// Server → Client request (RemoteFunction)
	export function CallClient<T = unknown>(name: string, player: Player, ...args: unknown[]): T {
		if (!isServer) error("CallClient can only be called from server");
		const func = getOrCreateFunction(name);
		return func.InvokeClient(player, ...args) as T;
	}

	// Client → Server request (RemoteFunction)
	export function CallServer<T = unknown>(name: string, ...args: unknown[]): T {
		if (!isClient) error("CallServer can only be called from client");
		const func = getOrCreateFunction(name);
		return func.InvokeServer(...args) as T;
	}

	// Server handles Call from Client
	export function OnServerInvoke<T = unknown>(name: string, handler: (player: Player, ...args: unknown[]) => T) {
		if (!isServer) return;
		const func = getOrCreateFunction(name);
		func.OnServerInvoke = handler;
	}

	// Client handles Call from Server
	export function OnClientInvoke<T = unknown>(name: string, handler: (...args: unknown[]) => T) {
		if (!isClient) return;
		const func = getOrCreateFunction(name);
		func.OnClientInvoke = handler;
	}

	// Server <-> Server (BindableEvent)
	export function Emit(name: string, ...args: unknown[]) {
		if (!isServer) return;
		getOrCreateBindable(name).Fire(...args);
	}

	export function OnEmit(name: string, handler: (...args: unknown[]) => void) {
		if (!isServer) return;
		getOrCreateBindable(name).Event.Connect(handler);
	}
}

export default Network;
