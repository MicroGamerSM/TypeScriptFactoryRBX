export type ChangeListener<T> = <K extends keyof T>(key: K, oldValue: T[K], newValue: T[K]) => void;
export default abstract class Observable<T extends object> {
	private readonly _listeners = new Set<ChangeListener<T>>();

	/** Subscribes to property changes. Returns an unsubscribe function. */
	Changed(fn: ChangeListener<T>): () => void {
		this._listeners.add(fn);
		return () => this._listeners.delete(fn);
	}

	protected constructor(initial: T) {
		// 1. Shallow-copy the fields before setting up the metatable
		for (const [k, v] of pairs(initial as Record<string, unknown>)) {
			(this as Record<string, unknown>)[k] = v;
		}

		// 2. Install metatable to observe changes
		setmetatable(this, {
			__index: (thisObject, key) => {
				const thisData = rawget(thisObject, key);
				if (thisData === undefined) {
					return rawget(Observable, key);
				}
				return thisData;
			},
			__newindex: (thisObject, key, value) => {
				const oldValue = rawget(thisObject, key);
				if (oldValue !== value) {
					rawset(thisObject, key, value);
					for (const listener of this._listeners) {
						listener(key as keyof T, oldValue as never, value as never);
					}
				}
			},
		});
	}
}
