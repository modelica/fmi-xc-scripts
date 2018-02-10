export * from "./db";
export * from "./file";

import { Database } from "./db";
import { FileSystemDatabase } from "./file";
import { GithubDatabase } from "./github";
import { DryrunDatabase } from "./dryrun";

export function createDatabase(type: string, artifactsDir: string | null, repo: string, branch: string): Database {
    if (type == "file") {
        if (artifactsDir) {
            return new FileSystemDatabase(artifactsDir);
        } else {
            console.warn("Warning, no output directory specified.  As a result, no data will be written.");
            return new DryrunDatabase();
        }
    }
    if (type == "github") {
        if (artifactsDir) {
            return new GithubDatabase(artifactsDir, repo, branch);
        } else {
            return new GithubDatabase(null, repo, branch);
        }
    }
    // if (type == "mongo") return new MongoDatabase();
    // if (type == "github") return new GithubDatabase();
    throw new Error("Unknown database type: " + type);
}
