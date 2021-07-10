const inquirer = require('inquirer');
const {updateConfig} = require("./helpers/config");
const {Worker} = require("worker_threads");
const {runTasks} = require("./tasks");
const {getCurrentChanges} = require("./helpers/config");
const {runTestQuestion, commandsQuestion, projectQuestion} = require("./helpers/questions");
const {getCurrentConfig, writeConfig} = require("./helpers/config");

function getCommands(command, project) {
    const commands = typeof command === 'string' ? command.split(',') : project.commands;

    if (commands.includes('install')) {
        console.warn('Cannot run npm install within lambda! Exiting without finishing config');
        process.exit(1);
    }

    return commands;
}

function startWorker(projectConfig) {
    console.log(`Watching project dir ${projectConfig.path}`);
    const worker = new Worker("./filewatcher/watcherWorker.js", {
        workerData: {
            path: projectConfig.path,
            name: projectConfig.name
        }
    });
    worker.on("error", error => {
        console.log(`Worker threw an error: ${error}`);
    });
    worker.on("exit", exitCode => {
        console.log(`Watcher exited unexpectedly with code ${exitCode}`);
    });
}

const runTestIfRequested = async (projectConfig) => {
    const answer = await inquirer.prompt(runTestQuestion);

    if(answer.run === 'true') {
        const changes = await getCurrentChanges(projectConfig.name);

        if(changes && Object.values(changes).some(v => !v.uploaded)) {
            console.log(`Running for ${projectConfig.name} with commands ${projectConfig.commands}...`);
            // const updatedProjectConfig = await runTasks(projectConfig, changes);
            // await updateConfig(updatedProjectConfig);
        } else {
            console.log('Did not find any changes to project!');
        }
        await runTestIfRequested(projectConfig);
    } else {
        process.exit(0);
    }
};

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
            ...project,
            commands,
        };
        startWorker(projectConfig);
        await runTestIfRequested(projectConfig);
    }
};

runProgram();
