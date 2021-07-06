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
    };
    return projects;
}

const handleSetup = async () => {
    let questions = setupQuestions;
    let currentConfig = await getCurrentConfig();

    if (currentConfig.region) {
        questions = questions.filter(q => q.name !== 'region');
    }

    const answers = await inquirer.prompt(questions);

    const region = answers.region || currentConfig.region;
    const projects = addProject(currentConfig, answers);
    const newConfig = {region, projects};

    await writeConfig(newConfig);
};

handleSetup()
