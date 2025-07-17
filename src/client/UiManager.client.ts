import { PlayerDetails } from "shared/Classes";
import { Event, Function } from "shared/Networker";

const TweenService = game.GetService("TweenService");

type BaseUi = ScreenGui & {
	Area: Frame & {
		Hotbar: Frame & {
			UIListLayout: UIListLayout;
			MoreButton: TextButton & {
				CanvasGroup: CanvasGroup & {
					UIListLayout: UIListLayout;
					About: TextButton;
				};
			};
			MoneyLabel: TextLabel;
		};
		About: Frame & {
			PrimaryButtonGroup: CanvasGroup & {
				Close: TextButton;
			};
			ContentArea: CanvasGroup & {
				Content: ScrollingFrame & {
					TextLabel: TextLabel;
				};
			};
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

const AllUpdatedEvent: Event<[], [PlayerDetails]> = Event.GetEvent("update.all");
const MoneyUpdatedEvent: Event<[], [number]> = Event.GetEvent("update.money");

const RequestUpdateFunction: Function<[], [PlayerDetails], [], []> = Function.GetFunction("update.money");

function UpdateAll(details: PlayerDetails) {
	UpdateMoney(details.money);
}

function UpdateMoney(money: number) {
	BaseUi.Area.Hotbar.MoneyLabel.Text = `$${formatNumber(money)}`;
}

AllUpdatedEvent.OnClientInvoke(UpdateAll);

MoneyUpdatedEvent.OnClientInvoke(UpdateMoney);

let MoreOptionsOpen: boolean = false;
BaseUi.Area.Hotbar.MoreButton.Activated.Connect(() => {
	MoreOptionsOpen = !MoreOptionsOpen;
	const targetPosition = new UDim2(MoreOptionsOpen ? 1 : 5, 8, 0, -13);
	const tweenInfo = new TweenInfo(0.333, Enum.EasingStyle.Quad, Enum.EasingDirection.Out);
	const tween = TweenService.Create(BaseUi.Area.Hotbar.MoreButton.CanvasGroup, tweenInfo, {
		Position: targetPosition,
	});

	tween.Play();
});

BaseUi.Area.Hotbar.MoreButton.CanvasGroup.About.Activated.Connect(() => {
	BaseUi.Area.About.Visible = !BaseUi.Area.About.Visible;
});

BaseUi.Area.About.PrimaryButtonGroup.Close.Activated.Connect(() => {
	BaseUi.Area.About.Visible = false;
});

wait(1);
UpdateAll(...RequestUpdateFunction.FireServer());
