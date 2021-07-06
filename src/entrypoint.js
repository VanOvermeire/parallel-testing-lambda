const {program} = require('commander');
const {script} = require("./imageBuilder");
const {getCurrentConfig, writeConfig} = require("./helpers/config");

function showListIfRequested(options, config) {
    if (options.list) {
        console.log(Object.keys(config.projects));
        process.exit(0);
    }
}

function getCommands(options) {
    const commands = typeof options.commands === 'string' ? options.commands.split(',') : config.projects[project].commands;

    if (commands.includes('install')) {
        console.warn('Cannot run npm install within lambda! Exiting without finishing config');
        process.exit(1);
    }

    return commands;
}

const runProgram = async () => {
    const config = await getCurrentConfig();

    if (!config || !config.projects) {
        console.warn('No config or projects found - please run setup first');
    } else {
        program.version('0.0.1');
        program
            .option('-p, --project <projectName>', 'Name of the project you want to test')
            .option('-c, --commands <commandName>', 'Test commands to run (like test). Will replace defaults.')
            .option('-l, --list', 'List the available projects')
        program.parse(process.argv);

        const options = program.opts();

        showListIfRequested(options, config);

        const currentProjects = Object.keys(config.projects);
        const project = currentProjects.filter(p => p === options.project);

        if (project.length === 0) {
            console.warn(`Did not find a project with that name. List of projects: ${currentProjects}`);
            process.exit(1);
        } else {
            const commands = getCommands(options);
            const projectConfig = {
                ...config.projects[project],
                commands,
            };
            const updatedProjectConfig = script(projectConfig);
            config.projects = {...config.projects, updatedProjectConfig};
            await writeConfig(config);
        }
    }
};

runProgram();
