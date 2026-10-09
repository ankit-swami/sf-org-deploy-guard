import * as vscode from 'vscode';
import { getDefaultTargetOrg, TargetOrgInfo } from './orgResolver';

const CONFIG_KEY = 'sfOrgDeployGuard.blockedOrgs';
const DEPLOY_ANYWAY = 'Deploy Anyway';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getBlockedOrgs(): string[] {
  const configured = vscode.workspace
    .getConfiguration()
    .get<string[]>(CONFIG_KEY, []);

  return configured
    .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
    .map(normalize);
}

export function isOrgBlocked(org: TargetOrgInfo, blockedOrgs: string[]): boolean {
  if (blockedOrgs.length === 0) {
    return false;
  }

  const candidates = [org.username, org.alias]
    .filter((value): value is string => Boolean(value))
    .map(normalize);

  return candidates.some((candidate) => blockedOrgs.includes(candidate));
}

/**
 * Returns true when deploy may proceed.
 * Returns false when the user cancels or the org cannot be resolved.
 */
export async function confirmDeployIfNeeded(): Promise<boolean> {
  const blockedOrgs = getBlockedOrgs();

  // Empty blocklist: no warning and no org lookup overhead.
  if (blockedOrgs.length === 0) {
    return true;
  }

  let org: TargetOrgInfo;

  try {
    org = await getDefaultTargetOrg();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`SF Org Deploy Guard: ${message}`);
    return false;
  }

  if (!isOrgBlocked(org, blockedOrgs)) {
    return true;
  }

  const label = org.alias
    ? `${org.alias} (${org.username})`
    : org.username;

  const choice = await vscode.window.showWarningMessage(
    `Target org ${label} is in your blocked list. Deploy anyway?`,
    { modal: true },
    DEPLOY_ANYWAY
  );

  return choice === DEPLOY_ANYWAY;
}
