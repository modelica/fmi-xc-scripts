import { Database } from "./db";
import { ToolsTable, FMUTable, CrossCheckTable } from "@modelica/fmi-data";
import { FileSystemDatabase } from "./file";

import { execSync } from "child_process";
import * as path from "path";
import * as tmp from "tmp";

tmp.setGracefulCleanup();

import * as debug from "debug";
const githubDebug = debug("fmi:github");

const userName = "process_repo script";
const userEmail = "webmaster@modelica.org";

export class GithubDatabase implements Database {
    private fs: FileSystemDatabase;
    private cleanup: () => void = () => undefined;
    protected workDir: string;
    constructor(dir: string | null, repo: string, protected branch: string) {
        if (dir) {
            this.workDir = dir;
        } else {
            let dir = tmp.dirSync({ unsafeCleanup: true });
            this.workDir = dir.name;
            console.warn("Using " + dir.name + " as Git (temporary) working directory");
            this.cleanup = () => {
                console.warn("Removing temporary Git working directory");
                dir.removeCallback();
            };
        }

        let cmd = `git clone ${repo} ${this.workDir}`;
        githubDebug("Running command '%s'", cmd);
        execSync(cmd);

        cmd = `git checkout ${branch}`;
        githubDebug("Checking out branch '%s' with '%s'", branch, cmd);
        execSync(cmd, { cwd: this.workDir });

        cmd = `git config user.name "process_repo script"`;
        githubDebug("Setting user name for commits with '%s'", userName);
        execSync(cmd, { cwd: this.workDir });

        cmd = `git config user.email "process_repo script"`;
        githubDebug("Setting user name for commits with '%s'", userEmail);
        execSync(cmd, { cwd: this.workDir });

        this.fs = new FileSystemDatabase(path.join(this.workDir, "_data"));
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

    /**
     * Remove any results associated with the given vendor
     *
     * @param id Vendor id
     */
    async removeVendor(id: string): Promise<void> {
        await this.fs.removeVendor(id);
    }

    async commit(): Promise<void> {
        await this.fs.commit();
    }

    async close(): Promise<void> {
        try {
            await this.fs.close();

            let cmd = `git add .`;
            githubDebug("Adding updated files in Github repo with '%s'", cmd);
            let output = execSync(cmd, { cwd: this.workDir }).toString();
            githubDebug("Output from '%s': '%s'", cmd, output);

            if (output === "") {
                githubDebug("No changes, nothing to commit or push");
                console.warn("No changes, nothing to commit or push");
                return;
            }

            cmd = `git commit -m "Updates after processing repository"`;
            githubDebug("Committing files in Github repo with '%s'", cmd);
            execSync(cmd, { cwd: this.workDir });

            cmd = `git push origin ${this.branch}`;
            githubDebug("Pushing files in Github repo with '%s'", cmd);
            execSync(cmd, { cwd: this.workDir });
        } catch (e) {
            throw e;
        } finally {
            this.cleanup();
        }
    }
}
