const AWS = require('aws-sdk');
const {DEFAULT_REGION} = require("./constants");

const stepfunctions = new AWS.StepFunctions({apiVersion: '2016-11-23', region: DEFAULT_REGION});

const waitForExecution = async (executionArn, resolve) => {
    const failStatus = ["FAILED", "TIMED_OUT", "ABORTED"];
    const running = "RUNNING";

    const result = await stepfunctions.describeExecution({
        executionArn,
    }).promise();

    if (running === result.status) {
        setTimeout(async () => {
            await waitForExecution(executionArn, resolve);
        }, 5000)
    } else {
        return resolve(result);
    }
};

const waitForExecutionToFinish = (executionArn) => {
    return new Promise((resolve) => {
        waitForExecution(executionArn, resolve);
    });
};

const buildInput = (projectInfo) => {
    // TODO get commands and locations from config and add to tasks
    const input = {
        name: projectInfo.name,
        tasks: [
            {
                command: 'test',
                location: 'lambdas/autologin'
            }
        ]
    }
    return JSON.stringify(input);
};

const startExecution = async (projectInfo) => {
    AWS.config.update({region: projectInfo.region});
    console.log(`Running tests in ${projectInfo.sfArn}`);

    const result = await stepfunctions.startExecution({
        stateMachineArn: projectInfo.sfArn,
        input: buildInput(projectInfo),
    }).promise();

    const results = await waitForExecutionToFinish(result.executionArn);
    const success = results.status === 'SUCCEEDED' && JSON.parse(results.output).every(r => r.succeeded === true);
    console.log(success);

    if(success) {
        console.log('All tests ran successfully!');
    } else {
        const failedTests = JSON.parse(results.output.filter(r => r.succeeded === false));
        console.log('Some tests failed. Some details are printed below. For more info, check your step function or cloudwatch logs');
        console.log(failedTests);
        process.exit(1);
    }
};

module.exports = {
    startExecution,
};
