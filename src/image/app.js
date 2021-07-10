const {execSync} = require('child_process')
const fs = require('fs/promises');
const path = require('path');
const AWS = require("aws-sdk");

const s3 = new AWS.S3();

async function isExists(path) {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

async function writeFile(filePath, data) {
    try {
        const dirname = path.dirname(filePath);
        const exist = await isExists(dirname);

        if (!exist) {
            await fs.mkdir(dirname, {recursive: true});
        }

        await fs.writeFile(filePath, data, 'utf8');
    } catch (err) {
        throw new Error(err);
    }
}

const downloadFile = async (params) => {
    const data = await s3.getObject(params).promise();
    // console.log(__dirname + params.Key);
    await writeFile('/tmp' + params.Key, data.toString());
};

const downloadFiles = async (bucket, keys) => {
    // TODO pass in the paths to download
    const allParams = [
        {
            Bucket: "vrt-oidc-client-bff-l-tester-base-resourcesbucket-3jyvcokak06a",
            Key: "lambdas/autologin/src/index.ts",
        },
        {
            Bucket: "vrt-oidc-client-bff-l-tester-base-resourcesbucket-3jyvcokak06a",
            Key: "lambdas/autologin/src/modules/autoLoginLogic.ts",
        },
    ];
    await Promise.all(allParams.map(downloadFile));
}

exports.handler = async (event) => {
    console.log(event);
    const { command, location, changes } = event;

    // TODO if list of file - download them to tmp
    if(changes) {
        // downloadFiles(process.env.BUCKET, changes);
    }

    try {
        execSync('cp -r application/ /tmp');

        const npmCommand = `npm run ${command}`;
        const dirInTemp = `/tmp/application/${location}`;
        console.log(`Running ${npmCommand} in ${dirInTemp}`);
        const result = execSync(npmCommand, {cwd: dirInTemp});
        console.log(result); // maybe remove?

        return {
            succeeded: true,
            result: JSON.stringify({command, location }),
        };
    } catch (err) {
        console.warn(`Tests failed with error: ${JSON.stringify(err)}`);
        return {
            succeeded: false,
            result: JSON.stringify({command, location }),
        };
    }
};
