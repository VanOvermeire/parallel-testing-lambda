// const chokidar = require('chokidar');

// chokidar.watch('/Users/vanovsa/Documents/vrt-oidc-client-bff', {
//     persistent: true,
//     ignoreInitial: true,
//     ignored: ['**/.git', '**/node_modules', '**/.idea', '**/coverage'],
// }).on('all', (event, path) => {
//     console.log(event, path); // add versus change // change /Users/vanovsa/Documents/vrt-oidc-client-bff/lambdas/autologin/src/index.ts
// });



const fs = require('fs/promises');
const {execSync} = require('child_process')
const AWS = require("aws-sdk");
// const fs = require('fs/promises');
const path = require('path');

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

const s3 = new AWS.S3();

const downloadFile = async (params) => {
    const data = await s3.getObject(params).promise();
    console.log(__dirname + params.Key);
    await writeFile(__dirname + '/' + params.Key, data.toString()); // should be /tmp in lambda
}

const downloadFiles = async () => {
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

const handler = async (event) => {
    console.log('do it')
    await downloadFiles();
};

handler();

