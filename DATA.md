# CircleCI - access commit and what files have changed?

 - No notifications generated for exports are changed

# Data Breakdown

## Data for Web Site

## Data for Other Vendors (Cross-Checking)

### Vendors Publish

#### Tool Information

   * Tool.info file(s) - Meta information about tool (capabilities)

#### FMU Export Data

To submit per exported FMU stored on the SVN server:
• {FMUName}.fmu: The FMU. If the FMU cannot be provided (e.g. because it contains
critical intellectual property), submit a file {FMUName}.nofmu. The ReadMe file shall
contain information about how to get access to that FMU directly from the exporting
tool vendor.
• {FMUName}_ref.csv: Reference solution as computed by the exporting tool. It is
recommended to limit the file to at most 10 of the important variables.
• {FMUName}_in.csv: optional input signals in case the FMU has inputs. If intermediate
values are required for continuous signals, linear interpolation is to be applied.
• A ReadMe.txt or ReadMe.pdf with (see Appendix C for an example Reade.txt), e.g.:
  ◦ description of the FMU (features, intent, compile/link details,...)
  ◦ email address where to contact exporting company in case of import problems
• {FMUName}_cc.bat: A batch file to run the experiment with the ComplianceChecker
for Windows platforms, {FMUName}_cc.sh for *nix platforms
• {FMUName}_cc.log: The log of the ComplianceChecker with minimal log level 3
(warning): -l 3. This allows smaller logs in case of excessively large files produced
with the default -l 4.
• {FMUName}_cc.csv: Result data for selected signals from the tool for that simulation
as .csv file
• {FMUName]_ref.opt: Options used to create reference output and to guide comparing
against, CSV format, required elements:
  ◦ StartTime, 0.0 // in seconds
  ◦ StopTime, 0.0 // in seconds
  ◦ StepSize, 0.01 // in seconds, 0.0 means variable step solver
  ◦ RelTol, 0.0001
optional elements:
  ◦ AbsTol, 2
  ◦ SolverType, FixedStep // see implementation notes for a list of predefined types
  ◦ OutputIntervalLength // reference data provided with this time spacing in seconds

Added by FMI MAP:

• notCompliantWithLatestRules: If a submission does not comply with the latest
submission rules, this file is present. To remove this file, vendors are allowed to adapt
all files to comply with the newest rules (except {FMUName}.fmu).
Observe the naming conventions given here, including case. We recommend keeping
{FMUName} short to avoid path length restriction problems on platforms like Windows.

#### Run Other Vendor's FMUs

To submit per imported FMU:
• A ReadMe.txt or ReadMe.pdf with
  ◦ a description of how to import and simulate each of the FMUs, if no test setup is
provided
  ◦ in case of failure to run: an analysis of the reasons.
This file is only needed if either test setup or test failure have to be described.
• A test setup for the importing tool to simplify verification of the test run by anyone
who licensed the importing tool. Ideally this uses some kind of automation provided by
the importing tool.
• {FMUName}_out.csv: Computed results as CSV file (CSV file format see Appendix
B) for the same variables as given in the reference CSV file
• In order to classify the result as “passed”, the results should correspond to the reference
solution.
• Vendors are encouraged to produce a screen-shot of the results and the reference
solution as displayed in the importing tool (for “important” signals) for simpler
validation of their claim “passed”.
• Test results are indicated with one of the following files: “passed”, “rejected” or
“failed”. If no such file is given, the test is considered “failed”.
Vendors of tools that import FMUs for the “c-code” platform and would like to be listed in the
Cross-Check Table have to organize one-to-one tests with exporting tool vendors in case they
are not providing “c-code” FMUs publicly to produce testimonials for successful Cross-Check
results.


### FMI Compliance Checker

   * Imports and Checks FMUs (test specification conformance)
   * Generates report
   * Simulation results are not
   * Currently run by the vendors (part of publishing FMUs)

### RULE #9


# Single Repo per VENDOR

.info files at root -> Compile into database
(tools.json)

svn-hooks - 
Test_FMUs (exported) FMU_Version/Flavor/platform/TOOL (should match)

Cross-Check - 
Raw: xc_results.json - complete (only need cross_check)
Processed: yml

public - World readable

Use cases:
  - Importing tool vendors (access potentially all repositories)
  - Web site (access to processed data)