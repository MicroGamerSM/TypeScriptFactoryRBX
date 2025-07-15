import { Event, Function } from "shared/Networker";

const RunService = game.GetService("RunService");

type BaseUi = ScreenGui & {
	Area: Frame & {
		Hotbar: Frame & {
			UIListLayout: UIListLayout;
			MoreButton: TextButton & {
				CanvasGroup: CanvasGroup & {
					UIListLayout: UIListLayout;
				};
			};
			MoneyLabel: TextLabel;
		};
	};
};

function chunkString(str: string, chunkSize = 3): string[] {
	const chunks: string[] = [];
	const total = str.size(); // lua length getter

	for (let i = 0; i < total; i += chunkSize) {
		// convert to 1‑based, inclusive indices
		const start = i + 1; // first char of this chunk
		const finish = math.min(
			total, // don’t run past the end
			start + chunkSize - 1,
		); // inclusive, so “‑1”

		chunks.push(str.sub(start, finish));
	}

	return chunks;
}

function formatNumber(n: number) {
	const stringParts: string[] = chunkString(tostring(n).reverse());
	return stringParts.join(",").reverse();
}

const BaseUi: BaseUi = game
	.GetService("Players")
	.LocalPlayer.WaitForChild("PlayerGui")
	.WaitForChild("BaseGui") as BaseUi;

const AllUpdatedEvent: Event<[], [number]> = Event.GetEvent("update.all");
const MoneyUpdatedEvent: Event<[], [number]> = Event.GetEvent("update.money");

const RequestUpdateFunction: Function<[], [number], [], []> = Function.GetFunction("update.money");

function UpdateAll(money: number) {
	UpdateMoney(money);
}

function UpdateMoney(money: number) {
	BaseUi.Area.Hotbar.MoneyLabel.Text = `$${formatNumber(money)}`;
}

AllUpdatedEvent.OnClientInvoke((money) => {
	UpdateMoney(money);
});

MoneyUpdatedEvent.OnClientInvoke((money) => UpdateMoney(money));

wait(10);
UpdateAll(...RequestUpdateFunction.FireServer());
