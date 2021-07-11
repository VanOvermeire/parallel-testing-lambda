const { readFile, writeFile } = require('fs/promises');

const CONFIG_PATH = './config.json';

const changesFilePath = (projectName) => `./${projectName}.json`;

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

const resetCurrentChanges = async (projectName) => {
    await writeFile(changesFilePath(projectName), '{}');
};

const writeConfig = async (config) => {
    await writeFile(CONFIG_PATH, JSON.stringify(config));
};

const updateConfig = async (projectInfo) => {
    const config = await getCurrentConfig();
    config.projects[projectInfo.name] = projectInfo;
    await writeConfig(config);
};

const addToChanges = (projectName) => async (change) => {
    const currentChanges = await getCurrentChanges(projectName);
    const wrappedChange =  { [change]: { uploaded: false }}
    const combined = {...currentChanges, ...wrappedChange};

    await writeFile(changesFilePath(projectName), JSON.stringify(combined));
};

const setChangesToUploaded = async (projectName) => {
    const currentChanges = await getCurrentChanges(projectName);
    const allUploaded = Object.fromEntries(
        Object.entries(currentChanges).map(entry => {
            entry[1].uploaded = true;
            return entry;
        })
    );

    await writeFile(changesFilePath(projectName), JSON.stringify(allUploaded));

}

module.exports = {
    getCurrentConfig,
    getCurrentChanges,
    resetCurrentChanges,
    writeConfig,
    updateConfig,
    addToChanges,
    setChangesToUploaded,
};
