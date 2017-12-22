import * as fs from 'fs';

/**
 * Establishes a "level" for flagging concerns while processing.
 */
export enum ReportLevel {
    Minor = 0,
    Major = 1,
    Fatal = 2,
}

/**
 * Defines the type for callbacks used to report issues.
 */
export type Reporter = (x: string, level: ReportLevel) => void;

/**
 * Yields a reporter that doesn't repeat itself
 * 
 * @export
 * @returns 
 */
export function consoleReporter(min: ReportLevel) {
    let reported = new Set<string>();
    let errors: { [vendor: string]: string[] } = {};
    let vendor: string = "";
    let reporter: Reporter = (msg: string, level: ReportLevel) => {
        if (reported.has(msg)) return;
        if (level >= min) {
            reported.add(msg);
            if (level >= ReportLevel.Fatal) {
                console.error("ERROR: " + msg);
            } else {
                console.warn("WARNING: " + msg);
            }
        }
        if (level >= ReportLevel.Fatal) {
            if (!errors.hasOwnProperty(vendor)) {
                errors[vendor] = [];
            }
            errors[vendor].push(msg);
        }
    }
    return {
        reporter: reporter,
        errors: errors,
    }
}

/**
 * Yields a reporter that doesn't repeat itself
 * 
 * @export
 * @returns 
 */
export function logReporter(min: ReportLevel, logfile: string) {
    let reported = new Set<string>();
    let errors: { [vendor: string]: string[] } = {};
    let vendor: string = "";

    if (fs.existsSync(logfile)) {
        fs.unlinkSync(logfile);
    }
    let reporter: Reporter = (msg: string, level: ReportLevel) => {
        if (reported.has(msg)) return;
        if (level >= min) {
            reported.add(msg);
            if (level >= ReportLevel.Fatal) {
                fs.appendFileSync(logfile, "ERROR: " + msg + "\n");
            } else {
                fs.appendFileSync(logfile, "WARNING: " + msg + "\n");
            }
        }
        if (level >= ReportLevel.Fatal) {
            if (!errors.hasOwnProperty(vendor)) {
                errors[vendor] = [];
            }
            errors[vendor].push(msg);
        }
    }
    return {
        reporter: reporter,
        errors: errors,
    }
}

export function enumerateErrors(errors: { [vendor: string]: string[] }) {
    let count = 0;
    let vendors = Object.keys(errors);
    for (let i = 0; i < vendors.length; i++) {
        let vendor = vendors[i];
        let msgs = errors[vendor];
        if (msgs.length == 0) continue;
        console.error("Errors for vendor: " + vendor);
        for (let j = 0; j < msgs.length; j++) {
            let msg = msgs[j];
            console.error("  " + msg);
            count++;
        }
    }
    if (count == 0) {
        console.log("Processing completed without any errors");
    }
    return count;
}
