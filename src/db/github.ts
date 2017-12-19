import { ToolsTable, ToolSummary, FMUTable, CrossCheckTable } from '@modelica/fmi-data';
import { Database } from './db';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as axios from 'axios';
import { AxiosRequestConfig } from 'axios';

import * as debug from 'debug';
const githubDebug = debug('fmi:github');

const toolsFile = "_data/tools.json";
const fmusFile = "_data/FMUs.json";
const xcFile = "_data/xc_results.json";

/**
 * An implementation of the Database interface that leverages GitHub (specifically
 * the FMI web site repository) as a persistence layer.
 */
export class GithubDatabase implements Database {
    private tools: Promise<ToolsTable> | null;
    async loadTools(_artifacts: string | null): Promise<ToolsTable> {
        if (this.tools) this.tools;

        githubDebug("Loading tools from GitHub");

        this.tools = readFile<ToolsTable>(toolsFile, "reading tools.json")
        // Tools data is loaded from GitHub
        let table = await this.tools;
        if (Array.isArray(table)) {
            githubDebug("  Table contains %d tools", table.length);
            return table;
        }
        throw new Error("Expected table data to be an array, but got: " + JSON.stringify(table));
    }

    async pushTools(toolMap: Map<string, ToolSummary>, locals: string[], artifacts: string | null): Promise<void> {
        let table: ToolsTable = Array.from(toolMap.values());
        githubDebug("Pushing data about %d tools: ", table.length);

        // Write out updated tools data first as artifacts on the file system (used only for debugging)
        if (artifacts) {
            fs.mkdirpSync(artifacts);
            let artifactsDir = path.join(artifacts, "tools.json");
            fs.writeFileSync(artifactsDir, JSON.stringify(table, null, 4));
            githubDebug("  Artifacts file for tools written to: %s", artifacts);
        } else {
            githubDebug("  No artifacts directory provided, skipping writing tools.json");
        }

        // Check if we have a GitHub OAUTH token.  If not, we cannot write.
        let token = process.env["GITHUB_TOKEN"];
        if (!token) {
            console.warn("WARNING: No GitHub token provided, skipping upload of tools data");
            githubDebug("  No GitHub token provided, skipping upload of tools data");
            return;
        }

        // Read latest tools data from GitHub
        // TODO: Make constants.
        let currentTable = await readFile<ToolsTable>(toolsFile, "push of tools.json");

        // Write to GitHub
        for (let key of locals) {
            githubDebug("  Injecting data for %s", key);
            let summary = toolMap.get(key);
            if (summary == null) continue;
            githubDebug("  Got summary for %s", key);
            let existing = currentTable.findIndex((x) => summary != null && x.id == summary.id);
            if (existing >= 0) {
                githubDebug("    Existing data for %s replacing with %j", key, summary);
                currentTable[existing] = { ...summary };
            } else {
                githubDebug("    No entry found for %s, appending %j", key, summary);
                currentTable.push({ ...summary });
            }
            githubDebug("  Injected data for tool %s", key);
        }

        // Write tools data back to GitHub
        await writeFile(toolsFile, currentTable, token, "push of tools.json");
        githubDebug("  Tool data written back to GitHub");
    }

    async pushFMUs(fmus: FMUTable, local: string[], artifacts: string | null): Promise<void> {
        githubDebug("Pushing data about %d FMUs: ", fmus.length);

        // Check if we have a GitHub OAUTH token.  If not, we can't do anything here
        let token = process.env["GITHUB_TOKEN"];
        if (!token) {
            console.warn("WARNING: No GitHub token provided, skipping upload of exported FMU data");
            githubDebug("  No GitHub token provided, skipping push of exported FMU data");
            return;
        }

        if (artifacts) {
            // Write artifacts to disk (used just for debugging)
            fs.mkdirpSync(artifacts);
            fs.writeFileSync(path.join(artifacts, "fmus.json"), JSON.stringify(fmus, null, 4));
            githubDebug("  Artifacts file for fmus written to: %s", artifacts);
        } else {
            githubDebug("  No artifacts directory provided, skipping writing fmus.json");
        }

        // Get current list of fmus
        let table = await readFile<FMUTable>(fmusFile, "push of fmus.json");

        // Remove all records related to the tools being processed
        for (let i = 0; i < local.length; i++) {
            githubDebug("  Removing entries for %s", local[i]);
            table = table.filter((fmu) => fmu.export_tool !== local[i]);
        }

        table = [...table, ...fmus];

        // Write FMU data
        await writeFile(fmusFile, table, token, "push of fmus.json");

        githubDebug("  All FMUs pushed to GitHub");
        return;
    }

    async pushCrossChecks(xc: CrossCheckTable, local: string[], artifacts: string | null): Promise<void> {
        githubDebug("Pushing data about %d cross check results: ", xc.length);

        if (artifacts) {
            fs.mkdirpSync(artifacts);
            fs.writeFileSync(path.join(artifacts, "xc_results.json"), JSON.stringify(xc, null, 4));
            githubDebug("  Artifacts file for cross-check results written to: %s", artifacts);
        } else {
            githubDebug("  No artifacts directory provided, skipping writing tools.json");

        }

        let token = process.env["GITHUB_TOKEN"];
        if (!token) {
            console.warn("WARNING: No GitHub token provided, skipping upload of cross check data");
            githubDebug("  No GitHub token provided, skipping push of cross check data");
            return;
        }

        // Get current list of fmus
        let results = await readFile<CrossCheckTable>(xcFile, "push of xc_results.json");

        // Remove all records related to the tools being processed
        for (let i = 0; i < local.length; i++) {
            githubDebug("  Removing entries for %s", local[i]);
            results = results.filter((x) => x.import_tool !== local[i]);
        }

        results = [...results, ...xc];

        await writeFile(xcFile, results, token, "push of xc_results.json");
        githubDebug("  All CrossCheck results pushed to GitHub");
    }
}

/**
 * Utility function for constructing the URL for a given file accessed via the API
 * @param file 
 */
function getContentsURL(file: string) {
    return `https://api.github.com/repos/modelica/fmi-standard.org/contents/${file}`
}

// Enable big file support
const big = true;

// Read a file from GitHub (via API, using tokens if available)
async function readFile<T extends {}>(file: string, during: string): Promise<T> {
    try {
        githubDebug("  Reading file %s", file);
        let config: AxiosRequestConfig = {
            headers: {},
        };

        let token = process.env["GITHUB_TOKEN"];
        if (token) {
            config.headers["Authorization"] = `token ${token}`
            githubDebug("    Adding Authorization header");
        } else {
            githubDebug("    Making request anonymously");
        }

        let url = getContentsURL(file);
        githubDebug("    API URL: %s", url);
        let resp = await axios.default(url, config);
        let sha = resp.data.sha;
        githubDebug("    SHA: %s", sha);
        let blobUrl = `https://api.github.com/repos/modelica/fmi-standard.org/git/blobs/${sha}`;
        githubDebug("    Blob URL: %s", blobUrl);
        if (big) {
            resp = await axios.default(blobUrl, config);
            githubDebug("    Data API response included: %j", Object.keys(resp));
            let blob = new Buffer(resp.data.content, resp.data.encoding);
            let obj = JSON.parse(blob.toString());

            return obj;
        } else {
            let download_url = resp.data.download_url;
            githubDebug("    Download URL: %s", download_url);
            resp = await axios.default(download_url, config);
            if (resp.status != 200) {
                githubDebug("      It looks like something went wrong, expected status code 200 during %s but got %d", during, resp.status);
            }
            return resp.data;
        }
    } catch (e) {
        throw e;
    }
}

/**
 * Write a file back to GitHub
 * @param file File to write
 * @param data Data to write
 * @param token GitHub token
 * @param during Used in debugging output
 */
async function writeFile<T extends {}>(file: string, data: T, token: string, during: string): Promise<void> {
    try {
        let config: AxiosRequestConfig = {
            headers: {
                Authorization: `token ${token}`,
            }
        };
        githubDebug("  Writing file %s", file);
        let url = getContentsURL(file);
        githubDebug("    URL for contents: %s", url);
        let cur = await axios.default(url, config);
        let sha = cur.data.sha;
        githubDebug("    Current SHA: %s", sha);
        let resp = await axios.default(url, {
            ...config, method: "PUT", data: {
                path: file,
                message: "Data pushed by fmi-scripts during " + during,
                content: new Buffer(JSON.stringify(data)).toString("base64"),
                sha: sha,
            }
        });
        githubDebug("    Updated file");
        if (resp.status != 200) {
            githubDebug("      It seems something went wrong, expect status code 200 but got %d", resp.status);
        }
    } catch (e) {
        if (e.hasOwnProperty("response")) {
            console.error(e.response.data);
        }
        throw new Error("Error writing " + file);
    }
}

