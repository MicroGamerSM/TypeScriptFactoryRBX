import { Event } from "shared/Networker";

const TextChatService = game.GetService("TextChatService");

const TextChannels: Folder = TextChatService.WaitForChild("TextChannels") as Folder;

const General: TextChannel = TextChannels.WaitForChild("RBXGeneral") as TextChannel;

const NotifyEvent: Event<[], [string, string | undefined]> = Event.GetEvent("notify");

NotifyEvent.OnClientInvoke((text: string, label: string | undefined) => {
	General.DisplaySystemMessage(`${label === undefined ? "" : `[${label}]: `} ${text}`);
});
