# Lambda Tester

## Overview

...

### Why note use CodeBuild or ECS?

I also did some experiments with both CodeBuild en ECS Tasks. On the plus, those solutions are more flexible, 
and require less set up. On the other hand, startup times are an issue (it can take a while before your task is even ready to start your tests) 
and at a glance the costs seem higher as well.

## Usage

First run the setup which will create the basic infrastructure and configuration for your project:

```
node config.js
```

This can take several minutes depending on the size of your project.

Once that is done, you can run the `run.js` command which will watch for file changes and allow you to run tests.

```
run.js
```

Important note! This should run whenever you are working on the project since it will keep an eye on change and send them to AWS. 
This is a speed optimization. You can use the config to update your project if you did not / do not want to do this.

## Requirements

- an AWS account
- configured AWS CLI
- npm & node (developed with v14.0.0)
- docker

## Use case

Mature projects with multiple subprojects where dependencies do not change as often and unit tests run slow, either
because there are a lot of them, or it is taking a while to handle Typescript transforms.

## Limitations

- the total size of your project *after npm install* should be below 500 MB
- *Individual test commands* will timeout after 5 minutes. So if you have a single package with hundreds of Typescript unit tests, that might be a problem

## Example estimates

### Example project

Example: a project of about 10 MB in size (with node modules 150 MB) with 20 subprojects, which you run 20 times a day, for 20 days a month, in Ireland.  
Also assuming you aren't running anything else in your account and so can benefit from Free Tier.

### Time example

Takes a bit more than 3 minutes to run locally.

- First run (with deploy of infrastructure and docker image): +- 5 minutes 30 seconds
- Run with new dependencies (so new docker image): +- 4 minutes
- Run with new files (): +- 1 minute?
- Run with new files and same container (quickly after previous run with new files): +- 15 seconds

So a nice speedup when only files changed since your last run. But slower for a first run or one with new dependencies.
The other advantage of running the tests on Lambda is your computer will not slow down. But again this is only an advantage
when you do not add new dependencies, since the docker build happens locally and will take quite a bit of CPU.

With provisioned capacity enabled (not yet included in this project) the speed with new files should be around 15 seconds, with a new image about 3 minutes 15 seconds.

### Price estimate

- Lambda: +- 9 dollars
- Step Functions: +- 0.1 dollars
- S3: +- 0.1 dollars 
- ECR: +- 0.3 dollars? (depends a lot on how many times your dependencies - and thus your image - change)
- Total: less than 10 dollars per month

So expect some costs if you use this intensively, but nothing massive.

With provisioned capacity enabled (not yet included in this project) there is an additional cost of about 15 dollars if you keep the capacity during the entire month.
