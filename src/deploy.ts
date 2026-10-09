import * as vscode from "vscode";
import { confirmDeployIfNeeded } from "./blockedOrgCheck";

/** Current + legacy Salesforce Extension Pack deploy command IDs. */
const SOURCE_PATH_COMMANDS = [
	"sf.metadata.deploy.source.path",
	"sf.deploy.current.source.file",
	"sfdx.force.source.deploy.source.path",
];

const ACTIVE_EDITOR_COMMANDS = [
	"sf.metadata.deploy.active.editor",
	"sf.deploy.current.source.file",
	"sfdx.force.source.deploy.current.source.file",
];

async function resolveAvailableCommand(
	candidates: string[],
): Promise<string | undefined> {
	const commands = await vscode.commands.getCommands(true);
	return candidates.find((id) => commands.includes(id));
}

/**
 * Guarded deploy for explorer / editor context (path-based).
 * Forwards the same URI args VS Code passes from the context menu.
 */
export async function deploySourcePath(
	sourceUri?: vscode.Uri,
	uris?: vscode.Uri[],
): Promise<void> {
	const allowed = await confirmDeployIfNeeded();
	if (!allowed) {
		return;
	}

	const commandId = await resolveAvailableCommand(SOURCE_PATH_COMMANDS);
	if (!commandId) {
		void vscode.window.showErrorMessage(
			"SF Org Deploy Guard could not find a Salesforce deploy command. Install/update the Salesforce Extension Pack.",
		);
		return;
	}

	await vscode.commands.executeCommand(commandId, sourceUri, uris);
}

/**
 * Guarded deploy for the active editor / command palette.
 */
export async function deployActiveEditor(): Promise<void> {
	const allowed = await confirmDeployIfNeeded();
	if (!allowed) {
		return;
	}

	const commandId = await resolveAvailableCommand(ACTIVE_EDITOR_COMMANDS);
	if (!commandId) {
		void vscode.window.showErrorMessage(
			"SF Org Deploy Guard could not find a Salesforce deploy command. Install/update the Salesforce Extension Pack.",
		);
		return;
	}

	await vscode.commands.executeCommand(commandId);
}
