const inquirer = require('inquirer');
const {writeConfig, getCurrentConfig} = require("./helpers/config");
const {setupQuestions} = require("./helpers/questions");

const addProject = (currentConfig, answers) => {
    const projects = currentConfig.projects || {};
    const path = answers.projectPath;
    const commands = answers.commands.split(',');

    if(commands.includes('install')) {
        console.warn('Cannot run npm install within lambda! Exiting without finishing config');
        process.exit(1);
    }

    const projectName = path.substr(path.lastIndexOf('/') + 1, path.length)
    projects[projectName] = {
        name: projectName,
        path,
        firstRun: true,
        commands,
        region: answers.region,
    };
    return projects;
}

const handleSetup = async () => {
    let questions = setupQuestions;
    let currentConfig = await getCurrentConfig();

    const answers = await inquirer.prompt(questions);

    // const region = answers.region || currentConfig.region;
    const projects = addProject(currentConfig, answers);
    const newConfig = {
        projects
    };

    await writeConfig(newConfig);
    console.log('Done with config, ready to start running tests.');
};

handleSetup()
