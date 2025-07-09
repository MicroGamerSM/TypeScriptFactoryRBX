import Network from "shared/Networker";

const TextChatService = game.GetService("TextChatService");

const TextChannels: Folder = TextChatService.WaitForChild("TextChannels") as Folder;

const General: TextChannel = TextChannels.WaitForChild("RBXGeneral") as TextChannel;

Network.OnClientReceive("notification", (message) => {
	General.DisplaySystemMessage(message as string);
});
