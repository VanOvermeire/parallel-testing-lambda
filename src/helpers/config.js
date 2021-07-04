const { readFile, writeFile } = require('fs/promises');

const CONFIG_PATH = './config.json';

const getCurrentConfig = async () => {
    try {
        const fileContent = await readFile(CONFIG_PATH);
        return JSON.parse(fileContent.toString());
    } catch (err) {
        return {};
    }
};

const writeConfig = async (config) => {
    await writeFile(CONFIG_PATH, JSON.stringify(config));
}

module.exports = {
    getCurrentConfig,
    writeConfig,
};
