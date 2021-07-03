const {execSync} = require('child_process')

exports.handler = async (event) => {
    const { command, location } = event;

    try {
        execSync('cp -r application/ /tmp'); // can only execute in tmp folder...

        const npmCommand = `npm run ${command}`;
        const dirInTemp = `/tmp/application/${location}`;
        const result = execSync(npmCommand, {cwd: dirInTemp});

        return {
            statusCode: 200,
            body: JSON.stringify({output: result.toString(), command, location }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({error: err, command, location }),
        };
    }
};
