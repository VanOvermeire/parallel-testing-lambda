const { readdir, readFile, writeFile } = require('fs/promises');
const { resolve, relative } = require('path');
const copydir = require('copy-dir');
const {execSync} = require('child_process');

const replaceDir = (currentDir, newDir) => (file) => file.replace(currentDir, newDir);

// not taking into account stuff like *.iml
const getGitIgnoreList = async (projectPath) => {
    const res = await readFile(`${projectPath}/.gitignore`);
    return res.toString().split('\n')
        .map(el => el.trim())
        .filter(el => el)
        .filter(el => !el.startsWith('#'));
};

const findPackageJsonDirs = (allFiles) => findPackageJsonFiles(allFiles).map(f => f.replace('package.json', ''));
const findPackageJsonDirsInCopy = (allFiles) => findPackageJsonDirs(allFiles);

const findPackageJsonFiles = (allFiles) => allFiles.filter(isPackageJson)
const findPackageJsonFilesInCopy = (allFiles) => findPackageJsonFiles(allFiles)
    // .map(replaceDir(directory, ourDirectory));

const isPackageJson = (file) => file.endsWith('package.json');

async function getFiles(dir, toIgnore) {
    const entries = await readdir(dir, {withFileTypes: true});
    const files = await Promise.all(entries.map((entry) => {
            const res = resolve(dir, entry.name);

            if (entry.name.endsWith('.git') || entry.name.endsWith('node_modules') || toIgnore.some(i => entry.name.endsWith(i))) {
                return null;
            } else if (entry.isFile()) {
                return res;
            } else {
                return getFiles(res, toIgnore);
            }
        })
            .filter(entry => entry)
    );
    return Array.prototype.concat(...files);
}

const copy = (fromDirectory, toDirectory, toIgnore) => {
    copydir.sync(fromDirectory, toDirectory, {
        filter: (stat, filepath, filename) => !(filename === '.git' || filename === 'node_modules' || toIgnore.some(i => i === filename))
    });
};

// TODO specific for bff - in general should just point to wherever jest etc was installed
const modifyPackageJsonString = (modify, fileContentAsString) => {
    return fileContentAsString.replace(modify, `../../node_modules/${modify}/bin/${modify}.js`);
};

const doesNotHaveModifiedAsDependency = (modify, fileContentAsString) => {
    const fileContentAsObject = JSON.parse(fileContentAsString);
    return !Object
        .keys({...fileContentAsObject.dependencies, ...fileContentAsObject.devDependencies})
        .some(entry => entry === modify);
}

const modifyPackageJsons = async (applicationDir, allFiles) => {
    const toModify = ['jest']; // TODO should somehow build a proper list (also add eslint)

    const packageJsonFiles = findPackageJsonFilesInCopy(allFiles);

    for (const filename of packageJsonFiles) {
        const fileContent = await readFile(filename);
        let fileContentAsString = fileContent.toString();

        for(const modify of toModify) {
            if(doesNotHaveModifiedAsDependency(modify, fileContentAsString)) {
                console.log(`${modify} is set globally and that will not work in lambda - pointing to actual location`); // OR install globally
                const refTo = `${applicationDir}/node_modules/${modify}/bin/${modify}.js`;
                const pathToDir = filename.replace('/package.json', '');
                const relativePath = relative(pathToDir, refTo);
                fileContentAsString = fileContentAsString.replace(modify, relativePath);
            }
        }
        await writeFile(filename, fileContentAsString);
    }
}

const runNpmInstall = (allFiles) => {
    findPackageJsonDirsInCopy(allFiles).forEach(dir => {
        console.log(`running npm install for ${dir}`);
        execSync('npm i', {cwd: dir}); // maybe with Promises -> parallel?
    });
};

const gatherAllDependencies = async (allFiles) => {
    return await Promise.all(findPackageJsonFilesInCopy(allFiles).map(name => readFile(name)))
        .then(files => files
            .map(f => f.toString())
            .map(JSON.parse)
            .map(f => ({
                name: f.name,
                dependencies: f.dependencies || {},
                devDependencies: f.devDependencies || {},
            }))
        );
};

module.exports = {
    getGitIgnoreList,
    getFiles,
    gatherAllDependencies,
    copy,
    modifyPackageJsons,
    runNpmInstall,
};
