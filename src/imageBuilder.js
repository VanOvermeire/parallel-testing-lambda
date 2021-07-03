// const fsPromises = require('fs/promises');
const { readdir, readFile, writeFile } = require('fs/promises');
const { resolve } = require('path');
const {execSync} = require('child_process');

const copydir = require('copy-dir');
const {deployStacks} = require("./helpers/deployer");

// TODO get dirs and ecr from somewhere
const ourDirectory = '/Users/vanovsa/Documents/parallel-testing-typescript/lambdaimage/application';
const repoLocation = '/Users/vanovsa/Documents/vrt-oidc-client-bff';
const ecr = '262438358359.dkr.ecr.eu-west-1.amazonaws.com';
const region = 'eu-west-1'; // default
const containerName = 'lambda-image-repo'; // pick one. lambda-tester maybe

process.env.PATH = process.env.PATH + ':/usr/local/bin'; // needed for execSync?

// TODO list requirements
//  npm, aws account, aws cli, docker

// TODO full basic flow
//  0) ask questions
//  1) create ecr repo if it does not exist yet
//  2) build the docker image
//  3) build stack for lambdas/step function/etc.
//  4) run stuff on command

// TODO command line stuff
//  should allow config
//  should keep hidden config with among other things the deps per project (repo location? repo name?)
//  enough logging

// TODO scenario after update of file
//  should then keep an eye on commits - if a file changes, upload it to s3 and tell lambda to replace original file
//  if deps change, need to upload new container


const docker = () => {
    const res = execSync(`./docker_run.sh ${ecr} ${containerName} ${region}`);
    console.log(res.toString()); // TODO remove?
}

// not taking into account stuff like *.iml
const getGitIgnoreList = async (gitignoreLocation) => {
    const res = await readFile(gitignoreLocation);
    return res.toString().split('\n')
        .map(el => el.trim())
        .filter(el => el)
        .filter(el => !el.startsWith('#'));
};

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

const copy = (directory, toIgnore) => {
    copydir.sync(directory, ourDirectory, {
        filter: (stat, filepath, filename) => !(filename === '.git' || filename === 'node_modules' || toIgnore.some(i => i === filename))
    });
};

const findPackageJsonDirs = (allFiles) => findPackageJsonFiles(allFiles).map(f => f.replace('package.json', ''));
const findPackageJsonDirsInCopy = (directory, ourDirectory) => (allFiles) => findPackageJsonDirs(allFiles).map(replaceDir(directory, ourDirectory));

const findPackageJsonFiles = (allFiles) => allFiles.filter(isPackageJson);
const findPackageJsonFilesInCopy = (directory, ourDirectory) => (allFiles) => findPackageJsonFiles(allFiles).map(replaceDir(directory, ourDirectory));

const isPackageJson = (file) => file.endsWith('package.json');
const replaceDir = (currentDir, newDir) => (file) => file.replace(currentDir, newDir);

const runNpmInstall = (directory, allFiles) => {
    findPackageJsonDirsInCopy(directory, ourDirectory)(allFiles).forEach(dir => {
        console.log(`running npm install for ${dir.replace(ourDirectory, '')}`);
        // const res = execSync('npm i', { cwd: dir })
        // console.log(res.toString())
    })
}

// too specific - in general should just point to wherever jest etc was installed
const modifyPackageJsonString = (modify, fileContentAsString) => {
    return fileContentAsString.replace(modify, `../../node_modules/${modify}/bin/${modify}.js`);
};

const doesNotHaveModifiedAsDependency = (modify, fileContentAsString) => {
    const fileContentAsObject = JSON.parse(fileContentAsString);
    return !Object
        .keys({...fileContentAsObject.dependencies, ...fileContentAsObject.devDependencies})
        .some(entry => entry === modify);
}

const modifyPackageJsons = async (directory, allFiles) => {
    const toModify = ['jest']; // should somehow build a proper list

    for (const filename of findPackageJsonFilesInCopy(directory, ourDirectory)(allFiles)) {
        const fileContent = await readFile(filename);
        let fileContentAsString = fileContent.toString();

        for(const modify of toModify) {
            if(doesNotHaveModifiedAsDependency(modify, fileContentAsString)) {
                console.log(`${modify} is set globally and that will not work in lambda - pointing to actual location`); // OR install globally
                fileContentAsString = modifyPackageJsonString(modify, fileContentAsString);
            }
        }
        await writeFile(filename, fileContentAsString);
    }
}

const script = async (directory) => {
    await deployStacks();
    // const toIgnore = await getGitIgnoreList(`${directory}/.gitignore`);
    // copy(directory, toIgnore);
    // const allFiles = await getFiles(directory, toIgnore)
    // runNpmInstall(directory, allFiles);
    // await modifyPackageJsons(directory, allFiles);
    // docker();
}

script(repoLocation)
    .then(console.log)
