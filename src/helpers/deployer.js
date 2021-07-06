const { readFile } = require('fs/promises');
const AWS = require('aws-sdk');
const {DEFAULT_REGION} = require("./constants");

const cloudformation = new AWS.CloudFormation({ region: DEFAULT_REGION });

const waitForStack = async (stackName, resolve) => {
    const okStatus = ["CREATE_COMPLETE", "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS", "UPDATE_COMPLETE"];
    const failStatus = ["CREATE_FAILED", "ROLLBACK_FAILED", "DELETE_FAILED", "UPDATE_ROLLBACK_IN_PROGRESS", "UPDATE_ROLLBACK_FAILED", "UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS", "UPDATE_ROLLBACK_COMPLETE"];

    const stackDetails = await cloudformation.describeStacks({
        StackName: stackName
    }).promise();
    const status = stackDetails.Stacks[0].StackStatus;

    if(failStatus.includes(status)) {
        throw new Error(`Stack failed with ${status}!`);
    } else if (!okStatus.includes(status)) {
        setTimeout(async () => {
            await waitForStack(stackName, resolve);
        }, 5000)
    } else {
        console.log(`${stackName} deployed. Status: ${status}`);
        return resolve();
    }
}

const waitForStackToFinish = (stackName) => {
    return new Promise((resolve) => {
        waitForStack(stackName, resolve);
    });
};

const createOrUpdate = async (stackName, params) => {
    try {
        await cloudformation.createStack(params).promise();
    } catch (err) {
        if (err.code !== 'AlreadyExistsException') {
            throw err;
        }
        try {
            await cloudformation.updateStack(params).promise();
        } catch (err) {
            if (err.code !== 'ValidationError' || err.message !== 'No updates are to be performed.') {
                throw err;
            }
        }
    }
    await waitForStackToFinish(stackName);
};


const getOutputValueForKey = (key, outputs) => {
    return outputs
        .filter(output => output.OutputKey === key)
        .map(output => output.OutputValue).shift();
};

const getStackOutputs = async (stackName) => {
    const stackDetails = await cloudformation.describeStacks({
        StackName: stackName
    }).promise();
    return stackDetails.Stacks.length > 0 ? stackDetails.Stacks[0].Outputs : {};
}

const findBaseOutputs = async (stackName) => {
    const outputs = await getStackOutputs(stackName);
    const bucketName = getOutputValueForKey('BucketName', outputs);
    const repoName = getOutputValueForKey('RepoName', outputs);
    const repoUri = getOutputValueForKey('RepoUri', outputs);

    return { bucketName, repoName, repoUri };
}

const findSfOutputs = async (stackName) => {
    const outputs = await getStackOutputs(stackName);
    const stepFunctionArn = getOutputValueForKey('StepFunctionArn', outputs);

    return { stepFunctionArn };
}

const deployBaseInfra = async (projectInfo) => {
    AWS.config.update({region: projectInfo.region});

    const baseInfra = await readFile('../infrastructure/repo_and_bucket.yaml');
    const baseStackName = `${projectInfo.name}-l-tester-base-infra`;

    const baseParams = {
        StackName: baseStackName,
        Capabilities: [
            'CAPABILITY_NAMED_IAM'
        ],
        Parameters: [
            {
                ParameterKey: 'ProjectName',
                ParameterValue: projectInfo.name
            }
        ],
        TemplateBody: baseInfra.toString(),
    };
    await createOrUpdate(baseStackName, baseParams);

    return await findBaseOutputs(baseStackName);
};

const deploySfInfra = async (projectInfo) => {
    AWS.config.update({region: projectInfo.region});

    const sfInfra = await readFile('../infrastructure/step_function.yaml');
    const sfStackName = `${projectInfo.name}-l-tester-sf`;
    const sfParams = {
        StackName: sfStackName,
        Capabilities: [
            'CAPABILITY_NAMED_IAM',
            'CAPABILITY_AUTO_EXPAND',
        ],
        Parameters: [
            {
                ParameterKey: 'ImageUri',
                ParameterValue: `${projectInfo.repoUri}:latest`,
            }
        ],
        TemplateBody: sfInfra.toString(),
    };
    await createOrUpdate(sfStackName, sfParams);

    return await findSfOutputs(sfStackName);
};

module.exports = {
    deployBaseInfra,
    deploySfInfra,
};
