/**
 * This file contains various utility functions shared by other packages.
 */

import { Reporter, ReportLevel } from './report';

import * as fs from 'fs';
import * as path from 'path';
var find = require('findit');

/**
 * This function finds all files with the given sufficx in the specified directory.
 * 
 * @param dir Directory to search
 */
export function findFilesWithSuffix(dir: string, suffix: string): string[] {
    let contents = fs.readdirSync(dir);
    return contents.filter((name) => name.endsWith(suffix));
}

/**
 * This function validates an array of elements returning the set of valid elements.  The
 * validate function should return a message describing why an element is invalid if it finds
 * a problem, otherwise it should return null.  Any issues found will be concatenated to
 * the issues argument.
 * 
 * @export
 * @template T 
 * @param {Array<T>} array 
 * @param {((x: T) => string | null)} validate 
 * @param {string[]} issues 
 * @returns {Array<T>} 
 */
export function validate<T>(array: Array<T>, validate: (x: T, report: Reporter) => void, report: Reporter): Array<T> {
    let ret: Array<T> = [];
    array.forEach((elem) => {
        let count = 0;
        let reporter = (x: string, level: ReportLevel) => {
            if (level > ReportLevel.Major) count++;
            report(x, level);
        }
        validate(elem, reporter);
        if (count == 0) ret.push(elem);
    })
    return ret;
}

export interface DirectoryDetails {
    dir: string;
    rel: string;
    parts: string[];
}

export function getDirectories(root: string): Promise<DirectoryDetails[]> {
    if (cachedDirectories.hasOwnProperty(root)) return Promise.resolve(cachedDirectories[root]);
    return new Promise((resolve, reject) => {
        let finder = find(root, {});
        let ret: DirectoryDetails[] = [];

        // Handle each directory
        finder.on('directory', (dir: string) => {
            // Identify relative path and then split it into components
            let rel = path.relative(root, dir);
            let parts = rel.split("/");

            ret.push({ dir: dir, rel: rel, parts: parts });
        })

        // Reject the promise if there is an error traversing the directory structure
        finder.on('error', (err: string) => {
            reject(err);
        })

        // Resolve the promise once we have complete traversing the directory structure
        finder.on('end', () => {
            cachedDirectories[root] = ret;
            resolve(ret);
        })
    })
}

const cachedDirectories: { [dir: string]: DirectoryDetails[] } = {};
