import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

const execFileAsync = promisify(execFile);

export interface TargetOrgInfo {
  alias?: string;
  username: string;
}

interface OrgDisplayJson {
  status: number;
  result?: {
    alias?: string;
    username?: string;
  };
  message?: string;
}

interface SfConfigFile {
  'target-org'?: string;
}

interface AliasFile {
  orgs?: Record<string, string>;
}

interface CachedOrg {
  org: TargetOrgInfo;
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000;
let cachedOrg: CachedOrg | undefined;

async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function workspaceConfigPaths(): string[] {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const paths: string[] = [];

  for (const folder of folders) {
    paths.push(
      path.join(folder.uri.fsPath, '.sf', 'config.json'),
      path.join(folder.uri.fsPath, '.sfdx', 'sfdx-config.json')
    );
  }

  return paths;
}

function globalConfigPaths(): string[] {
  const home = os.homedir();
  return [
    path.join(home, '.sf', 'config.json'),
    path.join(home, '.sfdx', 'sfdx-config.json'),
  ];
}

async function readTargetOrgValue(): Promise<string | undefined> {
  for (const configPath of [...workspaceConfigPaths(), ...globalConfigPaths()]) {
    const config = await readJsonFile<SfConfigFile>(configPath);
    const target = config?.['target-org']?.trim();
    if (target) {
      return target;
    }
  }
  return undefined;
}

async function readAliasMap(): Promise<Record<string, string>> {
  const home = os.homedir();
  const candidates = [
    path.join(home, '.sfdx', 'alias.json'),
    path.join(home, '.sf', 'alias.json'),
  ];

  for (const aliasPath of candidates) {
    const aliasFile = await readJsonFile<AliasFile>(aliasPath);
    if (aliasFile?.orgs && Object.keys(aliasFile.orgs).length > 0) {
      return aliasFile.orgs;
    }
  }

  return {};
}

/**
 * Resolve alias + username from local Salesforce config/alias files (no CLI).
 */
export async function resolveTargetOrgLocally(): Promise<TargetOrgInfo | undefined> {
  const target = await readTargetOrgValue();
  if (!target) {
    return undefined;
  }

  const aliases = await readAliasMap();
  const aliasEntries = Object.entries(aliases);

  const aliasMatch = aliasEntries.find(
    ([alias]) => alias.toLowerCase() === target.toLowerCase()
  );
  if (aliasMatch) {
    return {
      alias: aliasMatch[0],
      username: aliasMatch[1],
    };
  }

  const usernameMatch = aliasEntries.find(
    ([, username]) => username.toLowerCase() === target.toLowerCase()
  );
  if (usernameMatch) {
    return {
      alias: usernameMatch[0],
      username: usernameMatch[1],
    };
  }

  // Target may already be a username with no alias entry.
  if (target.includes('@')) {
    return { username: target };
  }

  // Unknown alias with no mapping — not enough info to match safely.
  return undefined;
}

async function resolveTargetOrgViaCli(): Promise<TargetOrgInfo> {
  const { stdout } = await execFileAsync('sf', ['org', 'display', '--json'], {
    maxBuffer: 10 * 1024 * 1024,
  });

  const parsed = JSON.parse(stdout) as OrgDisplayJson;

  if (parsed.status !== 0 || !parsed.result?.username) {
    throw new Error(
      parsed.message ??
        'No default Salesforce target org found. Authorize an org and set it as the default target.'
    );
  }

  return {
    alias: parsed.result.alias || undefined,
    username: parsed.result.username,
  };
}

/**
 * Resolves the default Salesforce target org.
 * Prefers local config/alias files; falls back to `sf org display --json`.
 * Results are cached for 30 seconds.
 */
export async function getDefaultTargetOrg(): Promise<TargetOrgInfo> {
  const now = Date.now();
  if (cachedOrg && cachedOrg.expiresAt > now) {
    return cachedOrg.org;
  }

  const local = await resolveTargetOrgLocally();
  const org = local ?? (await resolveTargetOrgViaCli());

  cachedOrg = {
    org,
    expiresAt: now + CACHE_TTL_MS,
  };

  return org;
}
