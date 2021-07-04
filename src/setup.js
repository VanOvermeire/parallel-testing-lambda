const inquirer = require('inquirer');
const { readFile, writeFile } = require('fs/promises');
const {setupQuestions} = require("./helpers/setupQuestions");

const getCurrentConfig = async () => {
    try {
        const fileContent = await readFile('./config.json');
        return JSON.parse(fileContent.toString());
    } catch (err) {
        return {};
    }
}

const setupProjects = (currentConfig, answers) => {
    const projects = currentConfig.projects || {};
    const path = answers.projectPath;
    const projectName = path.substr(path.lastIndexOf('/') + 1, path.length)
    projects[projectName] = {
        path
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
    const projects = setupProjects(currentConfig, answers);
    const newConfig = {region, projects};

    await writeFile('./config.json', JSON.stringify(newConfig));
};

handleSetup()
