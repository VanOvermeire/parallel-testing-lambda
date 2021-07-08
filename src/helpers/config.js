const { readFile, writeFile } = require('fs/promises');

const CONFIG_PATH = './config.json';

const changesFilePath = (projectName) => `../${projectName}.json`;

const getCurrentConfig = async () => {
    try {
        const fileContent = await readFile(CONFIG_PATH);
        return JSON.parse(fileContent.toString());
    } catch (err) {
        return {};
    }
};

const getCurrentChanges = async (projectName) => {
    try {
        const fileContent = await readFile(changesFilePath(projectName));
        return JSON.parse(fileContent.toString());
    } catch (err) {
        return {};
    }
};

const writeConfig = async (config) => {
    await writeFile(CONFIG_PATH, JSON.stringify(config));
}

const writeChangesFile = (projectName) => async (change) => {
    const currentChanges = await getCurrentChanges(projectName);
    const wrappedChange =  { [change]: { uploaded: false }}
    const combined = {...currentChanges, ...wrappedChange};

    await writeFile(changesFilePath(projectName), JSON.stringify(combined));
};

module.exports = {
    getCurrentConfig,
    writeConfig,
    writeChangesFile,
};
