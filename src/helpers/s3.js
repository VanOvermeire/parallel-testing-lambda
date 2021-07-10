const { readFile } = require('fs/promises');
const AWS = require("aws-sdk");

const s3 = new AWS.S3();

const uploadChangeToS3 = async ({bucket, key, path}) => {
    const fileContent = await readFile(path);
    await s3.putObject({
        Bucket: bucket,
        Key: key,
        Body: fileContent.toString()
    }).promise();
    return key;
};

const uploadChangesToS3 = async (projectConfig, changes) => {
    return await Promise.all(Object.entries(changes)
        .filter(entry => !entry[1].uploaded)
        .map(entry => entry[0])
        .map(path => ({path, key: path.replace(`${projectConfig.path}/`, ''), bucket: projectConfig.bucketName}))
        // .map(uploadChangeToS3)
    );
};

module.exports = {
    uploadChangesToS3,
}
