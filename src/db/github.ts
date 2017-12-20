import { Database } from './db';
import { ToolsTable, FMUTable, CrossCheckTable } from '@modelica/fmi-data';
import { FileSystemDatabase } from './file';

import { execSync } from 'child_process';
import * as path from 'path';

import * as debug from 'debug';
const githubDebug = debug("fmi:github");
githubDebug.enabled = true;

export class GithubDatabase implements Database {
    private fs: FileSystemDatabase;
    constructor(protected workDir: string, repo: string, branch: string) {
        let cmd = `git clone ${repo} ${workDir}`;
        githubDebug("Running command '%s'", cmd);
        execSync(cmd);

        let branchName = branch || "dynamic";
        cmd = `git checkout ${branchName}`;
        githubDebug("Checking out branch '%s' with '%s'", branchName, cmd);
        execSync(cmd, { cwd: workDir });
        this.fs = new FileSystemDatabase(path.join(workDir, "_data"));
    }
    async open(): Promise<void> {
        await this.fs.open();
    }

    /**
     * The tools listed are all the tools associated with specified vendor (and only tools
     * associated with the specified vendor).
     */
    async updateTools(updates: ToolsTable, vendorId: string): Promise<void> {
        await this.fs.updateTools(updates, vendorId);
    }

    /**
     * The FMUs listed are all the FMUs associated with specified vendor (and only tools
     * associated with the specified vendor).
     */
    async updateFMUs(updates: FMUTable, vendorId: string): Promise<void> {
        await this.fs.updateFMUs(updates, vendorId);
    }

    /**
     * The CrossCheck results listed are all the CrossCheck associated with specified vendor (and only tools
     * associated with the specified vendor).
     */
    async updateCrossChecks(updates: CrossCheckTable, vendorId: string): Promise<void> {
        await this.fs.updateCrossChecks(updates, vendorId);
    }

    async commit(): Promise<void> {
        await this.fs.commit();
    }

    async close(): Promise<void> {
        await this.fs.close();

        // TODO: git config stuff

        let cmd = `git add .`;
        githubDebug("Adding updated files in Github repo with '%s'", cmd);
        // execSync(cmd, { cwd: this.workDir });

        cmd = `git commit -m "Updates after processing repository"`;
        githubDebug("Committing files in Github repo with '%s'", cmd);
        // execSync(cmd, { cwd: this.workDir });

        cmd = `git push`;
        githubDebug("Pushing files in Github repo with '%s'", cmd);
        // execSync(cmd, { cwd: this.workDir });
    }
}