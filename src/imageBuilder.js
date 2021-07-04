const { readdir, readFile, writeFile } = require('fs/promises');
const { resolve } = require('path');
const {execSync} = require('child_process');

const copydir = require('copy-dir');
const {CONTAINER_NAME} = require("./helpers/constants");
const {deployBaseInfra, deploySfInfra} = require("./helpers/deployer");

// const ourDirectory = '/Users/vanovsa/Documents/parallel-testing-typescript/lambdaimage/application';
// const containerName = 'lambda-image-repo'; // pick one. lambda-tester maybe

process.env.PATH = process.env.PATH + ':/usr/local/bin'; // needed for execSync?

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


const docker = (projectInfo) => {
    const res = execSync(`./docker_run.sh ${projectInfo.repoName} ${CONTAINER_NAME} ${projectInfo.region}`);
    console.log(res.toString()); // TODO remove?
}

// not taking into account stuff like *.iml
const getGitIgnoreList = async (projectPath) => {
    const res = await readFile(`${projectPath}/.gitignore`);
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

const copy = (fromDirectory, toDirectory, toIgnore) => {
    copydir.sync(fromDirectory, toDirectory, {
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
    findPackageJsonDirsInCopy(directory, __dirname)(allFiles).forEach(dir => {
        console.log(`running npm install for ${dir.replace(__dirname, '')}`);
        const res = execSync('npm i', {cwd: dir});
        console.log(res.toString()); // TODO remove?
    })
};

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

    for (const filename of findPackageJsonFilesInCopy(directory, __dirname)(allFiles)) {
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

const script = async (projectInfo) => {
    const updatedProjectInfo = {...projectInfo};

    if(projectInfo.firstRun) {
        const { bucketName, repoName } = await deployBaseInfra(projectInfo);
        updatedProjectInfo.bucketName = bucketName;
        updatedProjectInfo.repoName = repoName;
    }

    const destinationDirectory = `${__dirname}/application`;
    const toIgnore = await getGitIgnoreList(projectInfo.path);
    // copy(projectInfo.path, destinationDirectory, toIgnore);
    const allFiles = await getFiles(destinationDirectory, toIgnore);
    runNpmInstall(destinationDirectory, allFiles);
    // await modifyPackageJsons(destinationDirectory, allFiles);
    // docker();

    // if(projectInfo.firstRun) {
    //     const {stepFunctionArn} = await deploySfInfra(updatedProjectInfo);
    //     updatedProjectInfo.sfArn = stepFunctionArn;
    //     updatedProjectInfo.firstRun = false;
    // }

    return updatedProjectInfo;
}

// TODO remove
const exampleProjectInfo = {
    name: 'bff',
    region: 'eu-west-1',
    path: "/Users/vanovsa/Documents/vrt-oidc-client-bff",
    firstRun: true,
};

script(exampleProjectInfo)
    .then(console.log)
