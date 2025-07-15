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

const BaseUi: BaseUi = game
	.GetService("Players")
	.LocalPlayer.WaitForChild("PlayerGui")
	.WaitForChild("BaseGui") as BaseUi;

const AllUpdatedEvent: Event<[], [number]> = Event.GetEvent("update.all");
const MoneyUpdatedEvent: Event<[], [number]> = Event.GetEvent("update.money");

function UpdateMoney(money: number) {}

AllUpdatedEvent.OnClientInvoke((money) => {
	UpdateMoney(money);
});

MoneyUpdatedEvent.OnClientInvoke((money) => UpdateMoney(money));
