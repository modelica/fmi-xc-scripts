export * from './db';
export * from './file';

import { Database } from './db';
import { FileSystemDatabase } from './file';
import { GithubDatabase } from './github';
import { DryrunDatabase } from './dryrun';

export function createDatabase(type: string, artifactsDir: string | null, repo: string, branch: string): Database {
    if (type == "file") {
        if (artifactsDir) {
            return new FileSystemDatabase(artifactsDir);
        } else {
            throw new Error("Directory required for 'file' type database in order to specify artifacts directory");
        }
    }
    if (type == "github") {
        if (artifactsDir) {
            return new GithubDatabase(artifactsDir, repo, branch);
        } else {
            throw new Error("Directory required for 'github' type database in order to specify working directory");
        }
    }
    if (type == "dryrun") {
        return new DryrunDatabase();
    }
    // if (type == "mongo") return new MongoDatabase();
    // if (type == "github") return new GithubDatabase();
    throw new Error("Unknown database type: " + type);
}