// would be nicer if project path was more flexible
const setupQuestions = [
    {
        type: 'input',
        name: 'projectPath',
        message: 'What is the (absolute) path to your project?',
    },
    {
        type: 'input',
        name: 'commands',
        message: 'What npm commands (separated by a comma) do you want to run?',
        default: 'test',
    },
    {
        type: 'input',
        name: 'region',
        message: 'What region do you want to deploy in?',
        default: 'eu-west-1'
    },
];

const projectQuestion = (projects) => {
    const projectNames = Object.keys(projects);

    return [
        {
            type: 'list',
            name: 'chosenProject',
            message: 'What project do you want to run (run setup to add additional ones)',
            choices: projectNames,
            default: 0,
        },
    ]
};

const commandsQuestion = (project) => {
    const commands = project.commands.join(',');

    return [
        {
            type: 'input',
            name: 'command',
            message: 'Specify commands to run if defaults are not ok',
            default: commands,
        }
    ];
}

module.exports = {
    setupQuestions,
    projectQuestion,
    commandsQuestion,
};
