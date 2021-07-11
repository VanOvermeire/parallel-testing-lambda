const {execSync} = require('child_process')
const fs = require('fs'); // no fs promises in node container
const path = require('path');
const AWS = require("aws-sdk");

const s3 = new AWS.S3();

const TMP_DIR = '/tmp';
const APP_DIR_IN_TMP = `${TMP_DIR}/application`;

function isExists(path) {
    return new Promise((resolve) => {
        fs.access(path, (err) => {
            if (err) {
                return resolve(false);
            }
            return resolve(true)
        });
    });
}

async function writeFile(filePath, data) {
    const dirname = path.dirname(filePath);
    const exist = await isExists(dirname);

    return new Promise((resolve, reject) => {
        if (!exist) {
            fs.mkdir(dirname, {recursive: true}, (err) => {
                if(err) {
                    return reject(err);
                }
                fs.writeFile(filePath, data, 'utf8', (err) => {
                    if(err) {
                        return reject(err);
                    }
                    return resolve();
                })
            });
        } else {
            fs.writeFile(filePath, data, 'utf8', (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            })
        }
    });
}

const downloadFile = async (params) => {
    const data = await s3.getObject(params).promise();
    // console.log(__dirname + params.Key);
    await writeFile(`${APP_DIR_IN_TMP}/${params.Key}`, data.toString());
};

const downloadFiles = async (bucket, keys) => {
    await Promise.all(keys
        .map(key => ({Bucket: bucket, Key: key}))
        .map(downloadFile));
};

exports.handler = async (event) => {
    console.log(event);
    const { command, location, changes } = event;

    try {
        execSync('cp -r application/ /tmp');

        if(changes) {
            console.log('downloading files'); // TODO remove
            await downloadFiles(process.env.BUCKET, changes);
        }


        const npmCommand = `npm run ${command}`;
        const dirInTemp = `${APP_DIR_IN_TMP}/${location}`;

        const tempie = execSync('ls -al', {cwd: dirInTemp}) // TODO remove
        console.log(tempie.toString());

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
