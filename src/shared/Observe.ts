export type ChangeListener<T extends object> = <K extends keyof T>(key: K, oldValue: T[K], newValue: T[K]) => void;
/**
 * Returns a proxy that allows access to the target, but listens for changes.
 * @param target The target object to proxy.
 * @param observer The function that detects changes.
 * @returns A proxy table that detects changes and forwards them to the observer.
 */
export default function Observe<T extends object>(target: T, observer: ChangeListener<T>): T {
	return table.freeze(
		setmetatable({} as T, {
			__index: (core: T, v) => {
				const key = v as keyof T;
				return target[key];
			},
			__newindex: (core: T, v, vv) => {
				const key = v as keyof T;
				const value = vv as T[keyof T];
				const oldValue = target[key];
				target[key] = value;
				if (oldValue === value) return;
				observer(key, oldValue, value);
			},
		}),
	);
}
