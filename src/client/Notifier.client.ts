import { EventV2 } from "shared/Networker";

const TextChatService = game.GetService("TextChatService");

const TextChannels: Folder = TextChatService.WaitForChild("TextChannels") as Folder;

const General: TextChannel = TextChannels.WaitForChild("RBXGeneral") as TextChannel;

const NotifyEvent: EventV2<undefined, [string, string | undefined]> = EventV2.Get("Notification");

NotifyEvent.OnClientFired((text: string, label: string | undefined) => {
	General.DisplaySystemMessage(`${label === undefined ? "" : `[${label}]: `} ${text}`);
});
