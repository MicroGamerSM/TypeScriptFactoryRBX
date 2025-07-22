type NotUndefined<T> = Exclude<T, undefined>;

// Represents a possible failure.
export class SuccessCase {
	readonly success: boolean;
	readonly message: string;

	// Returns a tuple representing the SuccessCase.
	ToTuple(): LuaTuple<[boolean, string]> {
		return $tuple(this.success, this.message);
	}

	// Warns if the SuccessCase contains a failure, prints otherwise.
	Display() {
		if (this.success) {
			print(this.message);
		} else {
			warn(this.message);
		}
	}

	// Errors if the SuccessCase contains a failure, prints otherwise.
	Assert() {
		if (this.success) {
			print(this.message);
		} else {
			error(this.message, 2);
		}
	}

	// Creates a SuccessCase from a tuple.
	static FromTuple(source: LuaTuple<[boolean, string]>) {
		return new SuccessCase(source[0], source[1]);
	}

	static Try<F extends (...args: readonly unknown[]) => void>(method: F, ...args: Parameters<F>): SuccessCase {
		try {
			method(...args);
		} catch (error) {
			if (typeOf(error) === "string") {
				return SuccessCase.Fail((error as string) ?? "Failed to parse the error message as a string.");
			}
		}
		return SuccessCase.Ok("The function completed successfully.");
	}

	// Creates a successful SuccessCase.
	static Ok(message: string): SuccessCase {
		return new SuccessCase(true, message);
	}

	// Creates an unsuccessful SuccessCase.
	static Fail(message: string): SuccessCase {
		return new SuccessCase(false, message);
	}

	static FromValueSuccessCase<J>(valueSuccessCase: ValueSuccessCase<J>): SuccessCase {
		return new SuccessCase(valueSuccessCase.success, valueSuccessCase.message);
	}

	private constructor(success: boolean, message: string) {
		this.success = success;
		this.message = message;
	}

	// Generates a string based on the SuccessCase.
	toString(): string {
		return `${this.success ? "✔️" : "✖️"} ${this.message}`;
	}
}

// Represents a possible failure, with data.
export class ValueSuccessCase<T> {
	readonly success: boolean;
	readonly message: string;
	readonly data: T;

	// Returns a tuple representing the ValueSuccessCase.
	ToTuple(): LuaTuple<[boolean, string, T]> {
		return $tuple(this.success, this.message, this.data);
	}

	// Returns a SuccessCase, discarding the data present.
	ToSuccessCase(): SuccessCase {
		return SuccessCase.FromValueSuccessCase(this);
	}

	// Returns a fallback value if the case represents a failure. The fallback cannot be undefined, and will never return undefined.
	DefaultValue(fallback: NotUndefined<T>): NotUndefined<T> {
		if (this.success) {
			if (this.data !== undefined) {
				print("not undefined successful data");
				return this.data as NotUndefined<T>;
			}
		}
		return fallback;
	}

	// Warns if the SuccessCase contains a failure, prints otherwise.
	Display() {
		if (this.success) {
			print(this.message);
		} else {
			warn(this.message);
		}
	}

	// Errors if the SuccessCase contains a failure, prints otherwise.
	Assert() {
		if (this.success) {
			print(this.message);
		} else {
			error(this.message, 2);
		}
	}

	// Creates a ValueSuccessCase from a tuple.
	static FromTuple<T>(source: LuaTuple<[boolean, string, T]>): ValueSuccessCase<T> {
		return new ValueSuccessCase(source[0], source[1], source[2]);
	}

	static Try<F extends (...args: readonly unknown[]) => J, J>(
		method: F,
		...args: Parameters<F>
	): ValueSuccessCase<J | undefined> {
		try {
			return ValueSuccessCase.Ok("The function completed successfully", method(...args));
		} catch (error) {
			return ValueSuccessCase.Fail(
				(error as string) ?? "Failed to parse the error message as a string.",
				undefined,
			);
		}
	}

	// Creates a successful ValueSuccessCase.
	static Ok<T>(message: string, data: T): ValueSuccessCase<T> {
		return new ValueSuccessCase(true, message, data);
	}

	// Creates an unsuccessful ValueSuccessCase.
	static Fail<T>(message: string, data: T): ValueSuccessCase<T> {
		return new ValueSuccessCase(false, message, data);
	}

	private constructor(success: boolean, message: string, data: T) {
		this.success = success;
		this.message = message;
		this.data = data;
	}

	// Generates a string based on the ValueSuccessCase.
	toString(): string {
		return `${this.success ? "✔️" : "✖️"} ${this.message}`;
	}
}
