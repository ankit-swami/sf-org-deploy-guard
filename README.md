# SF Org Deploy Guard

Warns before **SFDX: Deploy This Source to Org** when your default Salesforce target org is on a blocked list, then delegates the real deploy to the Salesforce Extension Pack.

## Requirements

- [Salesforce Extension Pack](https://marketplace.visualstudio.com/items?itemName=salesforce.salesforcedx-vscode)
- Salesforce CLI (`sf`) authenticated with a default target org
- An SFDX project open in VS Code (`sfdx-project.json`)

## Usage

1.  Configure blocked orgs (optional):
    - Go to VS Code Settings -> Extensions -> SF Org Deploy Guard -> Blocked Orgs -> Add Item -> Add either your Org **alias** or **username**

        OR

    - Add following in VS Code `settings.json`, Add either your Org **alias** or **username**

        ```json
        {
        	"sfOrgDeployGuard.blockedOrgs": [
        		"org-alias",
        		"org-username@company.com"
        	]
        }
        ```

        Matching is case-insensitive against the org **alias** or **username**. An empty list means no warning.

2.  Deploy with the guarded command (appears just above the standard SFDX deploy entry):
    - Right-click a source file/folder → **SFDX: Deploy This Source (Guarded) to Org**
    - Or Command Palette → **SFDX: Deploy This Source (Guarded) to Org**

3.  If the target org is blocked, choose **Deploy Anyway** to continue or dismiss / cancel to abort.

The original Salesforce Extension Pack deploy commands still exist; use SF Org Deploy Guard when you want the warning.

## Local development

```bash
cd ~/Path/of/your/local/repo/sf-org-deploy-guard
npm install
npm run compile
```

Open this folder in VS Code/Cursor and press **F5** (Run Extension).

## Package a VSIX

```bash
npx @vscode/vsce package
```

Install the generated `.vsix` via **Extensions: Install from VSIX...**.
