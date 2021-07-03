const { readFile } = require('fs/promises');
const AWS = require('aws-sdk');

const region = 'eu-west-1'; // default

const cloudformation = new AWS.CloudFormation({ region });

const waitForStack = async (stackName, resolve) => {
    const okStatus = ["CREATE_COMPLETE", "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS", "UPDATE_COMPLETE"]
    const stackDetails = await cloudformation.describeStacks({
        StackName: stackName
    }).promise();
    const status = stackDetails.Stacks[0].StackStatus;

    if (!okStatus.includes(stackDetails.Stacks[0].StackStatus)) {
        console.log(`Current status is ${status} - still waiting`);
        setTimeout(async () => {
            await waitForStack(stackName, resolve);
        }, 5000)
    } else {
        console.log(`Finished with status ${status}`);
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

const deployBaseInfra = async () => {
    console.log('Deploying basic infrastructure');
    const baseInfra = await readFile('../infrastructure/repo_and_bucket.yaml');
    const baseStackName = 'lambda-tester-base-infrastructure';

    const baseParams = {
        StackName: baseStackName,
        Capabilities: [
            'CAPABILITY_NAMED_IAM'
        ],
        TemplateBody: baseInfra.toString(),
    };
    await createOrUpdate(baseStackName, baseParams);

    return baseStackName;
};

const findBaseOutputs = async (stackName) => {
    const stackDetails = await cloudformation.describeStacks({
        StackName: stackName
    }).promise();
    const bucketName = stackDetails.Stacks[0].Outputs
        .filter(output => output.OutputKey === 'BucketName')
        .map(output => output.OutputValue);
    const repoName = stackDetails.Stacks[0].Outputs
        .filter(output => output.OutputKey === 'RepoName')
        .map(output => output.OutputValue);

    return { bucketName, repoName };
}

const deploySfInfra = async (repoName) => {
    console.log('Deploying lambda testers');
    const sfInfra = await readFile('../infrastructure/step_function.yaml');
    const sfStackName = 'lambda-tester-sf'
    const sfParams = {
        StackName: sfStackName,
        Capabilities: [
            'CAPABILITY_NAMED_IAM'
        ],
        Parameters: [
            {
                ParameterKey: 'ImageUri',
                ParameterValue: repoName
            }
        ],
        TemplateBody: sfInfra.toString(),
    };
    await createOrUpdate(sfStackName, sfParams);
}

const deployStacks = async () => {
    const baseStackName = await deployBaseInfra();
    const { bucketName, repoName } = await findBaseOutputs(baseStackName);
    await deploySfInfra(repoName);
};

module.exports = {
    deployStacks,
};
