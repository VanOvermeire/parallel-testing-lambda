# Lambda Tester

## Overview

...

## Usage

...

Note:
- the total size of your project *after npm install* should be below 500 MB. 
- *Individual test commands* will timeout after 5 minutes.

## Price estimate

Example: a project of about 10 MB in size (with node modules 100 MB) with 20 subprojects, which you run 20 times a day, for 20 days a month, in Ireland.  
Also assuming you aren't running anything else in your account and so can benefit from Free Tier.

- Lambda: 0 dollars
- Step Functions: +- 0.1 dollars
- S3: +- 0.1 dollars 
- ECR: +- 0.3 dollars? (depends a lot on how many times your dependencies - and thus your image - change)

In the example, using Lambdas for testing would probably cost less than a dollar per month.

## Requirements

- an AWS account
- configured AWS CLI
- npm & node (developed with v14.0.0)
- docker
