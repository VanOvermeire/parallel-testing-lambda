# Lambda Tester

## Overview

...

## Usage

First run the setup which will help you build a `config.json` file for your project(s):

```
node config.js
```

Once that is done, you can run the `run.js` command with `-p` or `--project`. Use `--help` to explore additional arguments.

```
run.js -p my-example-project
```

On a first run, this will set up your infrastructure and build a docker image for running the tests. 
Afterwards, if there are no changes to dependencies, these steps will be skipped (and everything will be much quicker).

Recommendation: use for 'mature' projects with multiple subprojects where dependencies do not change as often.
See also the 'Time example' below.

Some additional notes:
- the total size of your project *after npm install* should be below 500 MB. 
- *Individual test commands* will timeout after 5 minutes.

## Example estimates

### Example project

Example: a project of about 10 MB in size (with node modules 150 MB) with 20 subprojects, which you run 20 times a day, for 20 days a month, in Ireland.  
Also assuming you aren't running anything else in your account and so can benefit from Free Tier.

## Time example

Takes a bit more than 3 minutes to run locally.

- First run (with deploy of infrastructure and docker image): +- 5 minutes 30 seconds
- Run with new dependencies (so new docker image): +- 4 minutes
- Run with new files (): +- 1 minute?
- Run with new files and same container (quickly after previous run with new files): +- 15 seconds

So a nice speedup when only files changed since your last run. But slower for a first run or one with new dependencies.
The other advantage of running the tests on Lambda is your computer will not slow down. But again this is only an advantage
when you do not add new dependencies, since the docker build happens locally and will take quite a bit of CPU.

## Price estimate

- Lambda: 0 dollars
- Step Functions: +- 0.1 dollars
- S3: +- 0.1 dollars 
- ECR: +- 0.3 dollars? (depends a lot on how many times your dependencies - and thus your image - change)

So less than a dollar per month.

## Requirements

- an AWS account
- configured AWS CLI
- npm & node (developed with v14.0.0)
- docker
