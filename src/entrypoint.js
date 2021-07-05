const {program} = require('commander');
const {script} = require("./imageBuilder");
const {getCurrentConfig, writeConfig} = require("./helpers/config");

// TODO ask what commands to run - but also offer defaults in setup
const runProgram = async () => {
    const config = await getCurrentConfig();

    if (!config || !config.projects) {
        console.warn('No config or projects found - please run setup first');
    } else {
        program.version('0.0.1');
        program
            .requiredOption('-p, --project <projectName>', 'Name of the project you want to test')
            .option('-c, --commands <commandName>', 'Test commands to run (will replace defaults)');
        program.parse(process.argv);

        const options = program.opts();
        const currentProjects = Object.keys(config.projects);
        const project = currentProjects.filter(p => p === options.project);

        if (project.length === 0) {
            console.warn(`Did not find a project with that name. List of projects: ${currentProjects}`);
        } else {
            const projectConfig = {
                ...config.projects[project],
                commands: typeof options.commands === 'string' ? options.commands.split(',') : config.projects[project].commands
            };
            const updatedProjectConfig = script(projectConfig);
            config.projects = {...config.projects, updatedProjectConfig};
            await writeConfig(config);
        }
    }
};

runProgram();
