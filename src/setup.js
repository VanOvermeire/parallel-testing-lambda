const inquirer = require('inquirer');
const {setupTasks} = require("./tasks");
const {writeConfig, getCurrentConfig} = require("./helpers/config");
const {setupQuestions} = require("./helpers/questions");

const addProject = async (currentConfig, answers) => {
    const projects = currentConfig.projects || {};
    const path = answers.projectPath;
    const commands = answers.commands.split(',');

    if (commands.includes('install')) {
        console.warn('Cannot run npm install within lambda! Exiting.');
        process.exit(1);
    }

    const name = path.substr(path.lastIndexOf('/') + 1, path.length)

    if (projects[name]) {
        console.warn('A project with this name was already configured! Exiting.');
        process.exit(1);
    }

    projects[name] = await setupTasks({name, path, commands, region: answers.region});

    return projects;
}

const handleSetup = async () => {
    let currentConfig = await getCurrentConfig();

    const answers = await inquirer.prompt(setupQuestions);
    const projects = await addProject(currentConfig, answers);
    await writeConfig({
        projects
    });
    console.log('Done with config and setup. Now start run to track file changes and run tests.');
};

handleSetup()
