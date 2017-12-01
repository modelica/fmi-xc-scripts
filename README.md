# Scripts

## `process_repo`

This is the main script used to process vendor repositories and update the
central FMU data.  The `dir` flag indicates the directory to process.  The
`repo` flag should be the URL of the GitHub repository for the directory
being processed (this is used as a unique identifier for each vendor).

In addition to writing the processed data back to the central FMU database,
it also writes the same data to the file system as artifacts of the process.
The `artifacts` flag indicates where the processed data should be written
**relative to the directory specified by the `dir` flag.  The default value
is `"artifacts"`.  As such, that directory should be added to the `.gitignore`
file for each vendor repository (since this directory will be created when
testing and validating the vendor supplied data).

The `imports` flag can be used to disable the import (i.e., cross-checking)
data.

The `db` flag can have values of `"file"`, `"mongo"` and `"github"`.  The 
default is to use GitHub as the central FMU database.  Note that pushing
data to GitHub is only supported if the environment variable `GITHUB_TOKEN`
is supplied.  Otherwise, the push step will be skipped and the only real
work done by the script will be validation.

## `initialize_repo`

This script migrates legacy SVN data **in bulk**.  The `root` argument should
point to the directory containing the contents of the SVN repository.  The
`repodir` should point to a directory where tool specific repositories should
be created.

The `create`, `process` and `imports` flags enable or disable various steps
in the process (and all default to `true`).

## `create_repo`

This script is used to extract a given `tool` from the legacy SVN directory structure
(whose directory is indicated by the `root` flag).  The files for that tool will then
be relocated to a vendor specific repository located at `repo`.

**N.B.** This script is not very useful.  The first is because it is only used for
migration and second because it migrates tools one at a time (vs. the `initialize_repos`
scripts which will do them all at once).  As such, it exists basically for historical
purposes only.

