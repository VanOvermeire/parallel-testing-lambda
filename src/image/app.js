const {execSync} = require('child_process')

exports.handler = async (event) => {
    console.log(event);
    const { command, location, dependenciesChanged } = event;

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
