# Lambda Tester

## Overview

This repository exposes some command-line helpers to help you run unit tests on AWS Lambda.

### WHY? For the love of god, WHY?

Mostly for fun, motivated by one of our projects that takes several minutes & a lot of CPU to run ts-jest tests.
That and the looming question "could this actually work on Lambda?"

### Why not use something more suitable like CodeBuild or ECS?

I also did some experiments with both CodeBuild en ECS Tasks. 

On the plus, those solutions are more flexible and require less set up. 

On the other hand, startup times are an issue (it can take a while before your task is even ready to start your tests) 
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

After selecting the project you want to run tests for, `run.js` will start watching your repository for changes. 
It will ask you if you want to run your tests. If it sees there are changes, it will forward your command to AWS.

So `run.js` should in fact be active whenever you work on the repository of your choice! You can use the config to update your project if you did not track changes this way.

*Somewhat important note: I did not yet take the time to test the most recent version of a run with changed dependencies.*

## Requirements

- AWS account
- AWS CLI
- npm & node (developed with v14.0.0)
- docker (running daemon unless you want to get some ugly errors)

## Use case

Mature projects with multiple subprojects where a) dependencies do not change that often (dependency change means we need a new docker image - which is a lot slower) 
and b) unit tests run slow, either because there are a lot of them, or because the transforms are taking their sweet time.

## How it works

Basically, a copy of your project's code is added to a custom container for Lambda. The entrypoint of the Lambda is a small script that receives a (test) command and directory.

The Lambda handler will copy the application to the tmp folder, where we can execute commands, and run your given npm command there. A Step Function coordinates everything, passing individual commands to individual Lambdas. 

Because creating the docker image is time-consuming, `run.js` tracks the changes you make and uploads *only those files* to S3. The Lambda receives a list of updated files and downloads these before starting its run.

### Other approaches

I tried several other solutions that seemed more optimal. But the Lambda environment is not very permissive. 
So running the application in its normal location did not work due to permissions, and neither did running the install command in EFS (npm tries to change something related to the Lambda user - which is not allowed). 

## Limitations

- built-in assumptions about what your project looks like (a root package json that contains a lot but does not itself have tests, 
  at max delegating to other package.json files)
- the total size of your project *after npm install* should be below 500 MB (size of the tmp folder - see above)
- *Individual test commands* will timeout after 5 minutes. So if you have a single package with hundreds of Typescript unit tests, that might be a problem
  (but nothing is stopping you from changing `infrastructure/step_function.yaml` and increasing the timeout to 15 minutes)

## Some time and cost estimates

### Example project

Example: a project of about 10 MB in size (node modules about 150 MB) with 20 subprojects, which you run 20 times a day, for 20 days a month, in Ireland. So pretty intensive development.

Also assuming you aren't running anything else in your account and so can benefit from Free Tier.

### Time example

Takes about 3 minutes 30 seconds to run locally.

- Run with new dependencies (so new docker image): +- 3 minutes 30 seconds
- Run with new files (): +- 1 minute
- Run with new files and same Lambda container (within a brief time of previous files, minutes, but sometimes hours): +- 30 seconds

So a nice speedup *if* files are the only thing that changed since your last run. You could further improve this speed (at higher costs) 
if you were to use provisioned capacity, meaning every 'normal' run would be about 30 seconds.

The other advantage of running the tests on Lambda is your computer will not slow down. But this is only an advantage
when you do not add new dependencies, since the docker build happens locally and will take quite a bit of CPU.

### Price estimate

- Lambda: +- 9 dollars
- Step Functions: +- 0.1 dollars
- S3: +- 0.1 dollars 
- ECR: +- 0.3 dollars? (depends a lot on how many times your dependencies - and thus your image - change)
- Cloudwatch +- 0 dollars (though it somewhat depends on how much output your commands produce)
- Total: less than 10 dollars per month?

So expect some costs if you use this intensively.

If you were to add provisioned capacity, there is an additional cost of about 15 dollars if you keep the capacity during the entire month.

## TODO

- did not yet fully verify correct run with new dependencies
- does not take into account deletes or moves of files
- will fail on a large amount of changes (because event payload will be too big) - if so force new build?
- cannot currently be fully automated, requires human interaction
- irony that there are no unit tests in a project that helps unit testing
