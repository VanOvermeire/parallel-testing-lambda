const { readdir, readFile, writeFile } = require('fs/promises');
const { resolve, relative } = require('path');
const copydir = require('copy-dir');
const {execSync} = require('child_process');

const ALWAYS_TO_IGNORE = ['.git', 'node_modules', 'coverage'];

const isPackageJson = (file) => file.endsWith('package.json');

// TODO not taking into account stuff like *.iml
const getGitIgnoreList = async (projectPath) => {
    const res = await readFile(`${projectPath}/.gitignore`);
    return res.toString().split('\n')
        .map(el => el.trim())
        .filter(el => el)
        .filter(el => !el.startsWith('#'));
};

const findPackageJsonDirs = (allFiles) => findPackageJsonFiles(allFiles).map(f => f.replace('package.json', ''));
const findPackageJsonDirsInCopy = (allFiles) => findPackageJsonDirs(allFiles);

const findPackageJsonFiles = (allFiles) => allFiles.filter(isPackageJson);
const findPackageJsonFilesInCopy = (allFiles) => findPackageJsonFiles(allFiles);

// ignore probably not really needed since we filter out those files in the copy
async function getFiles(dir, toIgnore) {
    const entries = await readdir(dir, {withFileTypes: true});
    const files = await Promise.all(entries.map((entry) => {
            const res = resolve(dir, entry.name);
            const allToIgnore = ALWAYS_TO_IGNORE.concat(toIgnore);

            if (allToIgnore.some(i => entry.name.endsWith(i))) {
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
    console.log('Copying application to our local directory');
    copydir.sync(fromDirectory, toDirectory, {
        filter: (stat, filepath, filename) => !ALWAYS_TO_IGNORE.concat(toIgnore).some(i => i === filename)
    });
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
                console.log(`${modify} is set globally in ${filename}. That will not work in lambda, so pointing to actual location`); // OR install globally
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
        execSync('npm i', {cwd: dir, stdio: 'pipe'}); // maybe with Promises -> parallel?
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
