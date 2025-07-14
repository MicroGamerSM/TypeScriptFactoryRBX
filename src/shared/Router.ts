const ReplicatedStorage = game.GetService("ReplicatedStorage");
const RunService = game.GetService("RunService");

type Callback<T extends unknown[] = unknown[], R = void> = (...args: T) => R;

const isServer = RunService.IsServer();
const isClient = RunService.IsClient();

class Router {

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
