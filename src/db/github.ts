import { ToolsTable, ToolSummary, FMUTable, CrossCheckTable } from '@modelica/fmi-data';
import { Database } from './db';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as axios from 'axios';

import * as debug from 'debug';
const githubDebug = debug('fmi:github');
githubDebug.enabled = true;

githubDebug("  Axios = %o", axios.default);

function getContentsURL(file: string) {
    return `https://api.github.com/repos/modelica/fmi-standard.org/contents/${file}`
}

async function readFile<T extends {}>(file: string, during: string): Promise<T> {
    githubDebug("  Reading file %s", file);
    let url = getContentsURL(file);
    githubDebug("    API URL: %s", url);
    let resp = await axios.default(url, {});
    let download_url = resp.data.download_url;
    githubDebug("    Download URL: %s", download_url);
    resp = await axios.default(download_url, {});
    if (resp.status != 200) {
        githubDebug("      It looks like something went wrong, expected status code 200 during %s but got %d", during, resp.status);
    }
    return resp.data;
}

async function writeFile<T extends {}>(file: string, data: T, token: string, during: string): Promise<void> {
    githubDebug("  Writing file %s", file);
    let url = getContentsURL(file);
    githubDebug("    URL for contents: %s", url);
    let cur = await axios.default(url, {});
    let sha = cur.data.sha;
    githubDebug("    Current SHA: %s", sha);
    let resp = await axios.default(url, {
        method: "PUT",
        headers: {
            Authorization: `token ${token}`,
        },
        data: {
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
}

export class GithubDatabase implements Database {
    async loadTools(_artifacts: string): Promise<ToolsTable> {
        githubDebug("Loading tools from GitHub");

        let table = readFile<ToolsTable>("_data/tools.json", "reading tools.json");
        if (Array.isArray(table)) {
            githubDebug("  Table contains %d tools", table.length);
            return table;
        }
        throw new Error("Expected table data to be an array, but got: " + JSON.stringify(table));
    }

    async pushTools(toolMap: Map<string, ToolSummary>, locals: string[], artifacts: string): Promise<void> {
        let table: ToolsTable = Array.from(toolMap.values());
        githubDebug("Pushing data about %d tools: ", table.length);

        fs.mkdirpSync(artifacts);
        let artifactsDir = path.join(artifacts, "tools.json");
        fs.writeFileSync(artifactsDir, JSON.stringify(table, null, 4));
        githubDebug("  Artifacts file for tools written to: %s", artifactsDir);

        let token = process.env["GITHUB_TOKEN"];
        if (!token) {
            githubDebug("  No GitHub token provided, skipping push of tools");
            return;
        }

        let currentTable = await readFile<ToolsTable>("_data/tools.json", "push of tools.json");

        // Write to Mongo
        //let keys = Array.from(toolMap.keys());
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

        await writeFile("_data/tools.json", currentTable, token, "push of tools.json");
        githubDebug("  Tool data written back to GitHub");
    }

    async pushFMUs(fmus: FMUTable, local: string[], artifacts: string): Promise<void> {
        githubDebug("Pushing data about %d FMUs: ", fmus.length);

        let token = process.env["GITHUB_TOKEN"];
        if (!token) {
            githubDebug("  No GitHub token provided, skipping push of fmus");
            return;
        }

        fs.mkdirpSync(artifacts);
        fs.writeFileSync(path.join(artifacts, "fmus.json"), JSON.stringify(fmus, null, 4));

        // Get current list of fmus
        let table = await readFile<FMUTable>("_data/fmus.json", "push of fmus.json");

        // Remove all records related to the tools being processed
        for (let i = 0; i < local.length; i++) {
            githubDebug("  Removing entries for %s", local[i]);
            table = table.filter((fmu) => fmu.export_tool !== local[i]);
        }

        table = [...table, ...fmus];

        await writeFile("_data/fmus.json", table, token, "push of fmus.json");

        githubDebug("  All FMUs pushed to GitHub");
        return;
    }

    async pushCrossChecks(xc: CrossCheckTable, local: string[], artifacts: string): Promise<void> {
        githubDebug("Pushing data about %d cross check results: ", xc.length);

        fs.mkdirpSync(artifacts);
        fs.writeFileSync(path.join(artifacts, "xc_results.json"), JSON.stringify(xc, null, 4));

        let token = process.env["GITHUB_TOKEN"];
        if (!token) {
            githubDebug("  No GitHub token provided, skipping push of fmus");
            return;
        }

        // Get current list of fmus
        let results = await readFile<CrossCheckTable>("_data/xc_results.json", "push of xc_results.json");

        // Remove all records related to the tools being processed
        for (let i = 0; i < local.length; i++) {
            githubDebug("  Removing entries for %s", local[i]);
            results = results.filter((x) => x.import_tool !== local[i]);
        }

        results = [...results, ...xc];

        await writeFile("_data/xc_results.json", results, token, "push of xc_results.json");
        githubDebug("  All CrossCheck results pushed to GitHub");
    }
}