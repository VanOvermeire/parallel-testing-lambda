// would be nicer if project path was more flexible
const setupQuestions = [
    {
        type: 'input',
        name: 'region',
        message: 'What region do you want to deploy in?',
        default: 'eu-west-1'
    },
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
];

module.exports = {
    setupQuestions,
};
