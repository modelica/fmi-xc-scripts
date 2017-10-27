# Steps

  * Write a script to extract data for one specific tool
  * Write a tool to do this for **all** tools
  * Write a script to process tool directories.  Two modes:
     * Extract tool data (.info an Test_FMUs)
     * Extract cross-check data (CrossCheck_Results)

Explain the structure of the code here.

# Workflow

  * Vendors create repos for their tools
  * CircleCI runs validation on their particular tools
  * Vendor repos push artifacts to central repo
  * Central repo processes all the artifacts and updates the database
  * Central repo regenerates HTML? (pushes to web-site repo...regenerates page?!?)
  
