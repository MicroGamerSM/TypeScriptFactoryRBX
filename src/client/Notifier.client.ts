import { EventV2 } from "shared/Networker";
import { ShowNotificationBridge } from "./Bridges";

const TextChatService = game.GetService("TextChatService");

const TextChannels: Folder = TextChatService.WaitForChild("TextChannels") as Folder;

const General: TextChannel = TextChannels.WaitForChild("RBXGeneral") as TextChannel;

const NotifyEvent: EventV2<undefined, string> = EventV2.Get("Notification");

NotifyEvent.OnClientFired((text: string) => {
	ShowNotificationBridge.Cross(text);
});
