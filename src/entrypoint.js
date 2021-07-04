const {getCurrentConfig} = require("./helpers/config");
const { program } = require('commander');

const runProgram = async () => {
    const config = await getCurrentConfig();

    if (!config || !config.projects) {
        console.warn('No config or projects found - please run setup first');
    } else {
        program.version('0.0.1');
        program
            // .option('-d, --debug', 'output extra debugging')
            .requiredOption('-p, --project <projectName>', 'Name of the project you want to test');
        program.parse(process.argv);

        const options = program.opts();
        const currentProjects = Object.keys(config.projects);
        const project = currentProjects.filter(p => p === options.project);

        if (project.length === 0) {
            console.warn(`Did not find a project with that name. List of projects: ${currentProjects}`);
        } else {
            console.log('running');
            console.log(project);
            // pass this to our script
            // check if project has already run in config
            // if not, do first run with infra etc.
            // (if already run, check whether any dependencies have changed)
        }
    }
};

runProgram();
