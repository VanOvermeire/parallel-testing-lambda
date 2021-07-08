const inquirer = require('inquirer');
const {commandsQuestion} = require("./helpers/questions");
const {projectQuestion} = require("./helpers/questions");
const {script} = require("./tasks");
const {getCurrentConfig, writeConfig} = require("./helpers/config");

function getCommands(command, project) {
    const commands = typeof command === 'string' ? command.split(',') : project.commands;

    if (commands.includes('install')) {
        console.warn('Cannot run npm install within lambda! Exiting without finishing config');
        process.exit(1);
    }

    return commands;
}

const runProgram = async () => {
    const config = await getCurrentConfig();

    if (!config || !config.projects) {
        console.warn('No config or projects found - please run setup.js first');
    } else {
        const projects = config.projects;
        const { chosenProject } = await inquirer.prompt(projectQuestion(projects));
        const project = projects[chosenProject];

        const { command } = await inquirer.prompt(commandsQuestion(project));
        const commands = getCommands(command, project);

        const projectConfig = {
            ...project.config,
            commands: command,
        };

        console.log(`Starting to watch project dir ${projectConfig.path}`);

        // TODO instead start listening - and only run when an additional command comes
        //  and if there are too many temp files, force a new docker build (in background?)

        // TODO
        //  if a normal file changed, upload it to s3 and save the change somewhere? then download in container upon invocation
        //  if package json AND dep change, new docker is needed

        // TODO also store whether s3 upload has already occurred for files

        // console.log(`Running for ${project.name} with commands ${commands}...`);
        // const updatedProjectConfig = await script(projectConfig);
        // console.log('Updating configuration after run...');
        // config.projects[project.name] = updatedProjectConfig;
        // await writeConfig(config);
    }
};

runProgram();
