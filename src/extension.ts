import * as vscode from 'vscode';
import { deployActiveEditor, deploySourcePath } from './deploy';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'sfOrgDeployGuard.deploySourcePath',
      deploySourcePath
    ),
    vscode.commands.registerCommand(
      'sfOrgDeployGuard.deployActiveEditor',
      deployActiveEditor
    )
  );
}

export function deactivate(): void {
  // No cleanup required.
}
