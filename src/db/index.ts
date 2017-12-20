export * from './db';
export * from './file';

import { Database } from './db';
import { FileSystemDatabase } from './file';
// import { MongoDatabase } from './mongo';
// import { GithubDatabase } from './github';

export function createDatabase(type: string, artifactsDir: string | null): Database {
    if (type == "file") {
        if (artifactsDir) {
            return new FileSystemDatabase(artifactsDir);
        } else {
            throw new Error("Artifacts directory required for 'file' type database");
        }
    }
    // if (type == "mongo") return new MongoDatabase();
    // if (type == "github") return new GithubDatabase();
    throw new Error("Unknown database type: " + type);
}