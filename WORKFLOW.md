# Introduction

## Overview

This document describes (in excrutiating detail, I hope) exactly how the FMI data is
processed into what visitors will see on the [FMI web site](http://fmi-standard.org).

We start with a discussion of the data provided by each vendor. This documents
the structure of the data expected by each vendor and how that data should be
stored in a GitHub repository. The structure of vendor supplied data was
developed to make it easier for developers to store the data in human-readable
files with directory structure conventions.

The next section discusses the canonical machine-readable form the data will
be transformed into. This format is more suitable for storage and querying and
will be used for all subsequent processing.

After that, we describe how all the data from different vendors is integrated. This
involves reading the vendor data from repositories, validating it, integrating it
and then publishing it in the canonical form.

Even the canonical forms described and discussed in previous sections are, in some
sense, still "raw data". When we wish to visualize the data, we need to perform
further processing into what we call a "report" format. At the moment, there is
only one type of report we concerns ourselves with, but there may be others in the
future. These reports process the raw data into a structure so that it can be
visualized **such that the rendering code is devoid of any logical and is purely
presentational**.

Finally, we'll discuss how the FMI web site is actually generated. This will
cover not only how the HTML for the site is generated, but also how the dynamic
aspects of the web site function by pulling together canonical data, managing
UI state, generating reports and finally rendering reports.

## TL;DR

If you don't want to read all the details in this document, here is a quick summary
of how the workflow works.

[Vendor data](#vendor-data) is read from individual vendor repositories. That
data is then transformed into some [canonical data](#canonical-data) structures
that conceptually comprise "databases" of a) available [tools](#tool-data), b)
exported [FMUs](#fmu-data) and c) [cross-check results](#cross-check-data)
created from attempts to import exported from (purportedly) FMI compliant tools.
This data is [automatically (using a CI system)](#automation)
[validated](#validation), [merged](#merging-data) and [stored](#persistence) any
time the vendor repositories change. The FMI web site requires one further
processing step to generate a ["report"](#reports) data structure (based on
filtering criteria) which can then be dynamically rendered using
[React](https://reactjs.org/) components [developed specifically for visualizing
such report data](#widgets).

## Important Assumptions

It seems useful to call out some important assumptions so they don't get lost in
prose below.

1. All tools are assumed to have a unique tool id (see `<ToolID>` below for more
   details). Said another way, two vendors cannot have tools that have the same
   tool id.

# Vendor Data

Previously, the Modelica Association provided a single monolithic Subversion
repository with data for every tool. All vendors had access to the repository
and maintained information about all of their tools there. Unfortunately, the
size of this repository made it unmanageably large.

In 2017, it was decided to create a more distributed system for managing this
data where each vendor would manage the data for their tools in distinct repositories
separate from other vendors. In this way, each vendor had access and contorl over
only their data and each repository could be of a more manageable size.

Since the system was being "torn up", it was decided to make a few changes in
the data provided by the vendor. Most of these changes were "tweaks" just to
make things more logical, consistent or structured. Scripts were developed
(provided in this repository, see the [README](README.md)) for translating the
legacy data into the new format.

Vendors are responsible for providing two types of files. The first type
of file is the vendor information file. This file, named `<VendorID>.vendor`,
provides information on the vendor. There is only one vendor information
file. The other type of file is the `.tool` file. One file of this type
must be provided for each tool the vendor is publishing data for.

## Schemas

This section describes the format of the files provided by vendors.

### `.vendor` Files

The following is a sample `<VendorID>.vendor`. The text inside the `<>`s describes
the text that should be placed there by the vendor.

```ini
vendorId=<Unique Vendor ID...Provided by the Modelica Association>
displayName=<Vendor name as it should be displayed on web site>
href=<URL to vendor web site>
email=<Email address for vendor contact>
repo=<GitHub repository where this file is hosted>
```

The TypeScript type associated with this data is the `VendorDetails` interface
found in the NPM package `@modelica/fmi-data`.

### `.tool` Files

The following is a sample tool file. The text inside the `<>`s describes
the text that should be placed there by the vendor.

```ini
vendorId=<Unique Vendor ID...Provided by the Modelica Association>
displayName=<Vendor name as it should be displayed on web site>
href=<URL to vendor web site>
email=<Email address for vendor contact>
repo=<GitHub repository where this file is hosted>

[FMI1_0]
import=<'A' for available, 'P' for planned>
export=<'A' for available, 'P' for planned>
slave=<'A' for available, 'P' for planned>
master=<'A' for available, 'P' for planned>

[FMI2_0]
import=<'A' for available, 'P' for planned>
export=<'A' for available, 'P' for planned>
slave=<'A' for available, 'P' for planned>
master=<'A' for available, 'P' for planned>
```

All values defined within the `FMI1_0` and `FMI2_0` sections are optional.
**These values are only meaningful if there is no cross-check data available
for the tool**.

The TypeScript type associated with the tool data is the `ToolFile` interface
found in the NPM package `@modelica/fmi-data`.

## Vendor Repositories

### Information files

Each vendor should provide a repository that includes exactly one `.vendor`
file and one `<ToolID>.tool` file for each tool (where `<ToolId>` should be
replaced with an actual identifier for the tool). Note that this tool
identifier must be unique across all vendors (_i.e.,_ no two vendors can have
tools with the same tool id). The validation scripts will check to ensure this
is the case and flag an error if such a case is detected.

### Test FMUs

In addition, the repository can include a `Test_FMUs` directory that contains
any FMUs exported by any of the vendor's tools. The FMUs should be organized in
directories according to the following taxonomy:

```text
Test_FMUs/
  <FMI_Version>/
    <FMI_Variant>/
      <Platform>/
        <ToolID>/
          <Tool_Version>/
            <Name>/
              <Name>.fmu
              <Name>_ref.csv
              <Name>_in.csv
              <Name>_cc.log
              <Name>_cc.csv
              <Name>_ref.opt
              ReadMe.txt
```

...where `<FMI_Version>` has the possible values `FMI_1.0` or `FMI_2.0`,
`<FMI_Variant>` can be either `CoSimulation` or `ModelExchange`, `Platform` must
be one of: `win32`, `win64`, `linux32`, `linux64`, `darwin32`, `darwin64` or `c-code`.
The `<ToolID>` **must** match the identifier used for the associated `*.tool` file.
The `<Tool_Version>` string is up to the vendor to provide. Finally, the `<Name>`
value should be the name of the supplied FMU with the `.fmu` suffix stripped.

The `<Name>` directory is expected to find files pairing the `<Name>` of the directory
with the following suffixes: `.fmu`, `_ref.csv`, `_in.csv`, `_cc.log`, `_cc.csv`,
`_ref.opt`.

### Cross Check Data

Finally, the repository can includes a directory named `CrossCheck_Results` that
contains all cross check results the vendor wishes to publish. The nested structure
of directories within the `CrossCheck_Results` directory should conform to the
following pattern:

```text
CrossCheck_Results/
  <FMI_Version>/
    <FMI_Variant>/
      <Platform>/
        <ImportToolID>/
          <ImportTool_Version>/
            <ExportToolID>/
              <ExportTool_Version>/
                <Name>/
                  <Name>_out.csv
                  ReadMe.txt
                  passed | failed | rejected
```

The meanings of `<FMI_Version>`, `<FMI_Variant>`, `<Platform>` are all the same
as they are for the `Test_FMUs` directory. The `<ImportToolID>` and `<ExportToolID>`
values are, not surprisingly, the tool ids associated with the importing
and exporting tools, respectively (similarly for the `_Version` values). The
`<Name>` is again the name of the FMU (from the export tool). The `<Name>` directory
should contain a CSV file of the results trajectories, a README file and exactly
one file named either `passed`, `failed` or `rejected` to indicate whether the FMU
simulated correctly, was not simulated correctly or could not be read, respectively.

# Canonical Data

As mentioned previously, the contents of the vendor repository are the raw data
that feeds the workflow described in this document. This data is then put into
a canonical form which can be thought of as a "normalized form" ([in the database
sense](https://en.wikipedia.org/wiki/Database_normalization)).

This effectively means that each tool, FMU or cross-check result is considered
a single piece of data and that all of these types of data are concatenated
together into literal or conceptual arrays (depending on whether the data
is serialized into a file or persisteded in a proper database).

## Tool Data

The canonical tool data is represented by the `ToolSummary` type in the
`@modelica/fmi-data` package. This data structure is very similar to the
[described previously](#schemas) raw tool data found in `.tool` files. The
main exception (apart superficial differences in names of fields and possible
values) is that nothing is "optional" in the canonical form.

## FMU Data

The canonical data associated with exported FMUs is represented by the
`FMUDetails` type in the `@modelica/fmi-data` package. The data in
this type is mainly a decomposition of the FMU path in the vendor repository
(plus the vendor id).

## Cross-Check Data

Finally, the canonical form of the cross-check data is represented by the
`CrossCheckResult` type in `@modelica/fmi-data`. Like the `FMUDetails`
type, it is mainly used to register the individual values in the path
associated with each cross check result found in the vendor repository
**along with** the status indicated by the presence of either a `passed`,
`failed` or `rejected` file in the associated directory.

# Data Integration

Data integration is the process by which individual vendor data is aggregated
together with other vendor data to create a comprehensive collection of data
about all tools, fmus and cross-check results.

The data integration work is done by code in the
[`@modelica/fmi-xc-scripts`](https://github.com/modelica/fmi-xc-scripts)
package (where this document is located). All functions discussed in this
section can be found in that package.

## Parsing

Tool data (from `.tool` files) is parsed by the `parseToolFile` function.
**Note** that the tool identifier is not parsed from the contents of the file
but rather from the filename itself.

FMU data is extracted using the `parseExport` function. As mentioned
previously, this involves primarily extracting the salient parts of the
directory path into a data structure.

Cross check data is extracted using the `parseImport` function in much the same
way he FMU data is extracated.

## Validation

Tool data doesn't include any semantic validation. Instead, if there are issues
(_e.g.,_ invalid values for fields), an exception is thrown during parsing.
Recall that tool identifiers must be unique across **all vendors**. If the
vendor repository appears to be registering data for a tool that is already
associated with another vendor, it will be deemed invalid.

FMU data does involve some amount of validation because the FMI specification
requires certain information to be provided by the vendor beyond just
directories. This work is done by the `validateExport` function.

Similarly, cross check data requires semantic validation for the same reasons
as the FMU data and it is performed in a similar manner using the
`validateImport` function.

## Merging Data

The process of merging data is quite straight-forward for canonical data.
Once the data from a particular vendor is validated, that validated data can be
merged into the comprehensive data by following these steps:

1. Remove all previous data in the comprehensive data for any entries associated
   with the vendor whose data is being merged.
2. Insert all validated records extracted from the vendor data.

This process can be followed for tools, FMUs and cross-check results.

The "normalization" process makes this simple merging scheme possible. It
should be noted that this merging process is the same regardless of whether the
data is being persisted in a serialized form (JSON) or in a database. As such,
the merging process is designed this way to make it easy to perform merging for
both cases.

## Persistence

At present, the comprehensive data is persisted in the [FMI web site
repository](https://github.com/modelica/fmi-standard.org) as JSON. After the
merging has taken place, each of the tables is sorted into a canonical order and
serialized in a canonical way. If this canonical form of each table is identical
to what is currently stored in the FMI web site repository for that table, then
_nothing is done_ (there is nothing to update, since the data is identical).
If, however, the data is not identical then the entire (new) serialized JSON
form is added to the repository via a commit and pushed to the repository.

In the FMI web site repository, the table containing tool data is named
`_data/tools.json`, the table containing exported FMUs is named
`_data/fmus.json` and the table containing cross-check results is named
`_data/xc_results.json`. These names are important because they are written out
by the static site generator ([Jekyll](https://jekyllrb.com/)) when the site is
generated and hosted _along side_ the generated HTML. It is the very fact that
these files are hosted on the FMI web site that allows the rendering code (see
below) to find, parse and process them.

## Automation

The goal is for all the work described in this document to be completely
automated such that when a vendor makes a change to their data, that change
(assuming it is validated) can be automatically propagated to the FMI web site.
This is accomplished in two steps. The first step is triggered in response to
changes in the vendor repository. Our CI system is notified of such changes and
responds by [parsing](#parsing) and [validating](#validation) the data and then
[merging](#merging-data) that as previously been [persisted](#persistence). The
second step is triggered when new (and only new) data has been committed to the `_data`
directory in the FMI web site repository. Such a change then triggers the
re-running of Jekyll on the FMI web site repository and the uploading of the
resulting files to the hosting provider (along with the processed data). It
should be noted that this triggering of the site generation process happens on
_any_ commit to the FMI web site repository, not just those that touch files
in the `_data` directory.

# Reports

As previously mentioned, the [canonical data](#canonical-data) is comprehensive
(_i.e.,_ it contains all available data). But for visualization, we want to
"reduce" this data by summarizing details that are elaborated in the canonical
data but don't require the same degree of elaboration when visualized.

## Support Matrix Generation

At the moment, only one type of report is currently generated from the canonical
data. The goal of this report is to summarize the extent that various tools
support FMI. To this end, the `@modelica/fmi-data` package includes a function
named `createMatrixReport` which reduces the canonical data about tools and
cross-check results down into such a summary of support (optionally filtered by
FMI version, FMI variant and platform).

The `createMatrixReport` returns an instance of the `MatrixReport` type (also
defined in `@modelica/fmi-data`).

# Web Site

Ultimately, all of this work is primarily to support visualization of tool
support on the FMI web site. So it is worth some time understanding how this
data feeds that visualization process.

## Generation

As mentioned previously in the section on [automation](#automation), the FMI web
site is created using Jekyll. The data in the FMI web site repository is fed to
Jekyll which generates HTML files and copies other other data
files (_e.g.,_ `_data/tool.json`) into a directory which can be uploaded to a
hosting provider to host the web site (as a collection of static files).

The data about tools, FMUs and cross-check results (stored in the files
`_data/tools.json`, `_data/fmus.json` and `_data/xc_results.json`, respectively)
are among the files that are uploaded to the host and, as such, are available to
be requested from the site along with the HTML files. This is precisely the
mechanism by which the rendering code pulls this data into the browser.

## State

When a user visits the "Tools" page of the FMI web site, Javascript code is
triggered to render a summary of tool support for FMI as a dynamic element of
the page. Before any rendering can be done, the canonical data must be loaded.
This is accomplished by HTTP requests that fetch the various `.json` files that
contain the canonical data for tools and cross-check results. Once this data is
fetched, the data must be processed in a variety of ways. The main processing
step is to generate a [`MatrixReport`](#support-matrix-generation). But there
are other transformations that are also used during visualization (most of these
extract additional data from the `MatrixReport`).

The underlying "state" in the UI is primarily the canonical data (whether it is
loaded and, if so, what values it provides) along with the filter settings. All
other data we wish to visualize (_e.g.,_ the `MatrixReport`) is **derived** from
this state information. When the state is updated, _some_ parts of the UI must
be re-rendered. This can be a potentially difficult to determine owing to the
compilcated relationship between the state data and the derived data.
Fortunately, there is a wonderful Javascript package called `mobx` that not only
allows us to declaratively model the transformation of state data into derived
data but also can (by leveraging the packages `react` and `mobx-react`)
efficiently determine when and where data in the UI needs to be updated.

All issues with visualization state are handled by the `ViewState` class in `@modelica/fmi-widgets`.

## Widgets

Actual rendering is done using React and all UI components are written in
TypeScript. All rendering starts with the `SupportMatrixViewer` component in
`@modelica/fmi-widgets`. This component, in turn, is composed of other
components that focus on specific aspects of the UI (_e.g.,_ filter settings,
overlays, tables, _etc._). The details of the complete component tree are
beyond the scope of this document. The goal in this subsection is merely to
define the top-level component responsible for rendering and to indicate where
it can be found.

The `@modelica/fmi-widgets` package is responsible for all the Javascript
that gets loaded on the FMI web site. That Javascript code is contained in a
single file file entitled `build/bundle.js`. This file is produced by running
the command `yarn build` from the root directory of the
`@modelica/fmi-widgets` package. It should be noted that another file,
`build/bundle.css` is also produced by this process (although currently not used
on the FMI web site). The `build/bundle.js` file should be copied to
`static/js/bundle.js` in the FMI web site repository for deployment to the FMI
web site.

# Source Code

The source code associated with this project is distributed across several
NPM packages. The follow describes each package:

* `@modelica/fmi-data` - Primarily type definitions for different forms of
  raw and processed data.
  ([npm](https://www.npmjs.com/package/@modelica/fmi-data), [github](https://github.com/modelica/fmi-data))
* `@modelica/fmi-xc-script` - Repository where this file and all scripts for
  processing raw vendor data into canonical data are stored.
  `@modelica/fmi-widgets` - Repository where all code for **rendering** of
  canonical data and `MatrixReport` data can be found.

# Conclusion

This document outlines the entire process involved in transforming vendor data
into report data used to render the UI. Each of these steps has been
implemented using several TypeScript packages (mentioned previously) but they
could just as easily be reimplemented in other languages if someone is so
motivated. Hopefully this document sufficiently documents the process as well as
the data structure to enable such refactoring and evolution in the future.
