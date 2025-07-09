export enum ToolType {
	None = 0,
	Wood = 1,
	Stone = 2,
	Bronze = 3,
	Iron = 4,
}

export interface PlayerData {
	Money: number;
	AxeTool: ToolType;
	PickaxeTool: ToolType;
	ShovelTool: ToolType;
}

export class SuccessCase {
	readonly success: boolean;
	readonly message: string;

	ToTuple(): LuaTuple<[boolean, string]> {
		return $tuple(this.success, this.message);
	}

	// Warns in the SuccessCase contains a failure, prints otherwise.
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

	static FromTuple(source: LuaTuple<[boolean, string]>) {
		return new SuccessCase(source[0], source[1]);
	}

	static Ok(message: string): SuccessCase {
		return new SuccessCase(true, message);
	}

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

	toString(): string {
		return `${this.success ? "✔️" : "✖️"} ${this.message}`;
	}
}

export class ValueSuccessCase<T> {
	readonly success: boolean;
	readonly message: string;
	readonly data: T;

	ToTuple(): LuaTuple<[boolean, string, T]> {
		return $tuple(this.success, this.message, this.data);
	}

	ToSuccessCase(): SuccessCase {
		return SuccessCase.FromValueSuccessCase(this);
	}

	DefaultValue(fallback: T): T {
		if (this.success) return this.data;
		return fallback;
	}

	// Warns in the SuccessCase contains a failure, prints otherwise.
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

	static FromTuple<T>(source: LuaTuple<[boolean, string, T]>): ValueSuccessCase<T> {
		return new ValueSuccessCase(source[0], source[1], source[2]);
	}

	static Ok<T>(message: string, data: T): ValueSuccessCase<T> {
		return new ValueSuccessCase(true, message, data);
	}

	static Fail<T>(message: string, data: T): ValueSuccessCase<T> {
		return new ValueSuccessCase(false, message, data);
	}

	private constructor(success: boolean, message: string, data: T) {
		this.success = success;
		this.message = message;
		this.data = data;
	}

	toString(): string {
		return `${this.success ? "✔️" : "✖️"} ${this.message}`;
	}
}
