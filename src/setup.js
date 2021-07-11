const inquirer = require('inquirer');
const {updateQuestion, configQuestion, setupQuestions} = require("./helpers/questions");
const {setupTasks} = require("./tasks");
const {writeConfig, getCurrentConfig} = require("./helpers/config");

const addProject = async (currentConfig, answers) => {
    const projects = currentConfig.projects || {};
    const path = answers.projectPath.endsWith('/') ? answers.projectPath.substr(0, answers.projectPath.length - 1) : answers.projectPath;
    const commands = answers.commands.split(',');
    const region = answers.region;
    const imageVersion = 1;

    if (commands.includes('install')) {
        console.warn('Cannot run npm install within lambda! Exiting.');
        process.exit(1);
    }

    const name = path.substr(path.lastIndexOf('/') + 1, path.length)

    if (projects[name]) {
        console.warn('A project with this name was already configured! Exiting.');
        process.exit(1);
    }

    projects[name] = await setupTasks({name, path, commands, region, imageVersion});

    return projects;
};

const updateProject = async (currentConfig, projectName) => {
    const projects = currentConfig.projects || {};
    const projectInfo = projects[projectName];

    projects[projectName] = await setupTasks(projectInfo); // optimisation would be to skip stuff that is not needed

    return projects;
};

const handleSetup = async () => {
    const currentConfig = await getCurrentConfig();
    let projects;

    const { createOrUpdate } = await inquirer.prompt(configQuestion);

    if(createOrUpdate === 'create') {
        const answers = await inquirer.prompt(setupQuestions);
        projects = await addProject(currentConfig, answers);

    } else {
        const { chosenProject } = await inquirer.prompt(updateQuestion(currentConfig.projects));
        projects = await updateProject(currentConfig, chosenProject);
    }

    await writeConfig({
        projects
    });


    console.log('Done with config and setup. Now start run to track file changes and run tests.');
};

handleSetup()
