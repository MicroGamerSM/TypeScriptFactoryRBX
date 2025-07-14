//#region Setup
import { SuccessCase } from "shared/SuccessCase";

const Players = game.GetService("Players");
const Workspace = game.GetService("Workspace");

type PlotObject = Model & {
	BasePart: Part;
	Bounds: Part;
	Sign: Part & {
		Display: Part & {
			ClickDetector: ClickDetector;
			SurfaceGui: SurfaceGui & {
				TextLabel: TextLabel;
			};
		};
	};
};

const PlotsFolder = Workspace.FindFirstChild("Plots") as Folder;
assert(PlotsFolder, "Plots folder not found");
const plots = PlotsFolder.GetChildren().map((plot) => plot as PlotObject);

const OwnershipData = new Map<Player, PlotObject>();
const OwnershipDataR = new Map<PlotObject, Player>();
//#endregion

function isPlotOwned(plot: PlotObject): boolean {
	return OwnershipDataR.has(plot);
}

function getPlayerPlot(player: Player): PlotObject | undefined {
	return OwnershipData.get(player);
}

function tryClaimPlot(player: Player, plot: PlotObject): SuccessCase {
	if (!player || !plot) {
		return SuccessCase.Fail("invalid arguments");
	}
	if (isPlotOwned(plot)) {
		return SuccessCase.Fail("plot already owned");
	}
	if (getPlayerPlot(player)) {
		return SuccessCase.Fail("player already owns a plot");
	}

	OwnershipData.set(player, plot);
	OwnershipDataR.set(plot, player);

	plot.Sign.Display.SurfaceGui.TextLabel.Text = player.DisplayName;

	return SuccessCase.Ok("plot claimed");
}

function tryReleasePlot(player: Player): SuccessCase {
	if (!player) {
		return SuccessCase.Fail("invalid arguments");
	}
	const plot = getPlayerPlot(player);
	if (!plot) {
		return SuccessCase.Fail("player owns no plot");
	}

	plot.Sign.Display.SurfaceGui.TextLabel.Text = "Unclaimed";

	OwnershipData.delete(player);
	OwnershipDataR.delete(plot);

	return SuccessCase.Ok("plot released");
}

function preparePlot(plot: PlotObject) {
	const clickDetector = plot.Sign.Display.ClickDetector;

	clickDetector.MouseClick.Connect((player: Player) => {
		print(`Player ${player.DisplayName} is trying to claim plot ${plot.Name}`);
		tryClaimPlot(player, plot).Display();
	});
}

plots.map(preparePlot);

Players.PlayerRemoving.Connect((player: Player) => tryReleasePlot(player).Display());
