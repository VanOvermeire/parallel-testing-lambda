const AWS = require('aws-sdk');
const {DEFAULT_REGION} = require("./constants");

const stepfunctions = new AWS.StepFunctions({apiVersion: '2016-11-23', region: DEFAULT_REGION});

const waitForExecution = async (executionArn, resolve) => {
    const running = "RUNNING";

    const result = await stepfunctions.describeExecution({
        executionArn,
    }).promise();

    if (running === result.status) {
        setTimeout(async () => {
            await waitForExecution(executionArn, resolve);
        }, 3000)
    } else {
        return resolve(result);
    }
};

const waitForExecutionToFinish = (executionArn) => {
    return new Promise((resolve) => {
        waitForExecution(executionArn, resolve);
    });
};


const buildInput = (projectInfo, changes) => {
    // TODO actually use this
    const tasks = projectInfo.locations.flatMap(location => {
        return projectInfo.commands.map(command => {
            return {
                command,
                location,
                changes,
            }
        });
    });
    console.log(tasks);

    const input = {
        name: projectInfo.name,
        tasks: [
            {
                command: 'test',
                location: 'lambdas/autologin',
                changes,
            }
        ]
    }
    return JSON.stringify(input);
};

const startExecution = async (projectInfo, changes) => {
    AWS.config.update({region: projectInfo.region});

    const result = await stepfunctions.startExecution({
        stateMachineArn: projectInfo.stepFunctionArn,
        input: buildInput(projectInfo, changes),
    }).promise();

    const results = await waitForExecutionToFinish(result.executionArn);
    const success = results.status === 'SUCCEEDED' && JSON.parse(results.output).every(r => r.succeeded === true);

    if(success) {
        console.log('All tests ran successfully!');
    } else {
        const failedTests = JSON.parse(results.output || '[]').filter(r => r.succeeded === false).map(r => r.result);
        console.log('Some tests failed, see output below. For more details, check the cloudwatch logs');
        console.log(failedTests);
    }
};

module.exports = {
    startExecution,
};
