const AWS = require('aws-sdk');
const {DEFAULT_REGION} = require("./constants");

const stepfunctions = new AWS.StepFunctions({apiVersion: '2016-11-23', region: DEFAULT_REGION});

const waitForExecution = async (executionArn, resolve) => {
    const failStatus = ["FAILED", "TIMED_OUT", "ABORTED"];
    const running = "RUNNING";

    const result = await stepfunctions.describeExecution({
        executionArn,
    }).promise();

    if (failStatus.includes(result.status)) {
        return resolve({sfSuccess: false, result});
    } else if (running === result.status) {
        setTimeout(async () => {
            await waitForExecution(executionArn, resolve);
        }, 5000)
    } else {
        return resolve({sfSuccess: true, result});
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
    console.log('Running tests');

    const result = await stepfunctions.startExecution({
        stateMachineArn: projectInfo.sfArn,
        input: buildInput(projectInfo),
    }).promise();

    const res = await waitForExecutionToFinish(result.executionArn);
    console.log(res);
};

module.exports = {
    startExecution,
};
