# Scripts

## `process_repo`

```text
Usage: process_repo [--logfile logfile] [--output output] [--db file|mongo|github] [--imports true|false] dir1 dir2 ...
```

This is the main script used to process vendor repositories and update the
central FMU data. The `dir*` arguments indicates the directories to process.

### Options

* `--db file|github` - Indicates where data should be read from and written to.
  (default: `file`)
* `--repo ...` - The GitHub repository to read from and write data to. Note,
  this option only applies when the `--db` is set to **`github`**. Note that
  pushing data to GitHub is only supported if the environment variable `GITHUB_TOKEN`
  is supplied. Otherwise, the push step will be skipped and the only real
  work done by the script will be validation.
  (default: `git@github.com:xogeny/fmi-standard.org.git`)
* `--branch ...` - Specifies which branch should be used when `--db` is set to **`github`**.
  (default: `master`)
* `--output ...` - The directory to read from and write data to. Note,
  this only applies when the `--db` is set to **`file`**. If no value for `output` is specified,
  then no legacy data will be used to initialize the processing and no data will be written (see
  [use cases](#use-cases) for more details).
* `--imports true|false` - If set to true, import (_i.e.,_ corss-check) data is ignored. (default: `false`)
* `--pedantic true|false` - If set to true, scripts are stricter in what they accept. (default: `false`)
* `--moved true|false` - If set to true, tools are not checked against previous vendor ids. This should only
  be turned on if a tool is suddenly owned by a different vendor. (default: `false`).
* `--logfile ...` - Name of file to write output to. If nothing is specified, output will be written
  to standard out.

### Use Cases

To simple test processing of a directory defaults values should be sufficient for basic tests, _e.g._,

```sh
$ process_repo <DIR>
```

In this case, no legacy data is read in and none of the data created will be written. **This is how vendors
can perform some basic validation on their data.**

To save the resulting data, simply specify an output directory, _e.g.,_

```sh
$ process_repo <DIR> --output <OUTPUT_DIRECTORY>
```

To process in the context of legacy data, the `github` option can be used with with `--db` flag, _e.g._,

```sh
$ process_repo <DIR> --db github
```

**NB** If you have permission to write to the repository specified by the `--repo` flag, your changes **will be committed
back to the repo**.

## `initialize_repo`

This script migrates legacy SVN data **in bulk**. The `root` argument should
point to the directory containing the contents of the SVN repository. The
`repodir` should point to a directory where tool specific repositories should
be created.

## `create_repo`

This script is used to extract a given `tool` from the legacy SVN directory structure
(whose directory is indicated by the `root` flag). The files for that tool will then
be relocated to a vendor specific repository located at `repo`.

**N.B.** This script is not very useful. The first is because it is only used for
migration and second because it migrates tools one at a time (vs. the `initialize_repos`
scripts which will do them all at once). As such, it exists basically for historical
purposes only.

# Workflow

The overall workflow for processing FMI data from vendor supplied information all the
way to support metric presented on the FMI web site is detailed
[in a separate document](WORKFLOW.md).
