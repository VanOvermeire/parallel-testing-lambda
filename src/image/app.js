const {execSync} = require('child_process')

exports.handler = async (event) => {
    console.log(event);
    const { command, location } = event;

    try {
        console.log('Copying application to tmp folder (so we can execute)')
        execSync('cp -r application/ /tmp');

        const npmCommand = `npm run ${command}`;
        const dirInTemp = `/tmp/application/${location}`;
        console.log(`Running ${npmCommand} in ${dirInTemp}`);
        const result = execSync(npmCommand, {cwd: dirInTemp});

        return {
            succeeded: true,
            result: JSON.stringify({output: result.toString(), command, location }),
        };
    } catch (err) {
        return {
            succeeded: false,
            result: JSON.stringify({error: err, command, location }),
        };
    }
};
