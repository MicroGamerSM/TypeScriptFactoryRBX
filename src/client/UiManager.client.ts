import { EventV2, FunctionV2 } from "shared/Networker";
import { ShowNotificationBridge } from "./Bridges";
// import PlayerDetails from "shared/PlayerDetails";
import IPlayerData from "shared/IPlayerData";

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
		Notifications: CanvasGroup;
	};
	ExampleNotification: TextLabel;
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

const AllUpdatedEvent: EventV2<void, IPlayerData> = EventV2.Get("Update All UI");
const MoneyUpdatedEvent: EventV2<void, number> = EventV2.Get("Update Money");

const RequestUpdateFunction: FunctionV2<void, IPlayerData, void, void> = FunctionV2.Get("Get Player Details");

function ShowNotification(text: string) {
	const NewNotification = BaseUi.ExampleNotification.Clone();
	NewNotification.Text = text;
	NewNotification.LayoutOrder = BaseUi.Area.Notifications.GetChildren().size();
	NewNotification.Parent = BaseUi.Area.Notifications;
	NewNotification.Visible = true;
	task.spawn(() => {
		wait(15);
		NewNotification.Destroy();
	});
}

function UpdateAll(details: IPlayerData) {
	UpdateMoney(details.money);
}

function UpdateMoney(money: number) {
	BaseUi.Area.Hotbar.MoneyLabel.Text = `$${formatNumber(money)}`;
}

AllUpdatedEvent.OnClientFired(UpdateAll);

MoneyUpdatedEvent.OnClientFired(UpdateMoney);

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
UpdateAll(RequestUpdateFunction.InvokeServer());

ShowNotificationBridge.SetCrossCallback(ShowNotification);
