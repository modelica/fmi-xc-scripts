export * from './db';
export * from './file';
export * from './github';
export * from './mongo';

import { Database } from './db';
import { FileSystemDatabase } from './file';
import { MongoDatabase } from './mongo';
import { GithubDatabase } from './github';

export function createDatabase(type: string): Database {
    if (type == "file") return new FileSystemDatabase();
    if (type == "mongo") return new MongoDatabase();
    if (type == "github") return new GithubDatabase();
    throw new Error("Unknown database type: " + type);
}