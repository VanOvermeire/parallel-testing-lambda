const {startExecution} = require("./helpers/execution");
const {copy} = require("./helpers/fileHandlers");
const {execSync} = require('child_process');

const {getFiles, getGitIgnoreList, modifyPackageJsons, runNpmInstall, gatherAllDependencies} = require("./helpers/fileHandlers");
const {deployBaseInfra, deploySfInfra} = require("./helpers/deployer");

process.env.PATH = process.env.PATH + ':/usr/local/bin'; // needed for execSync

// TODO name of file?

const currentDir = __dirname;
const destinationDir = `${currentDir}/application`;

const docker = (projectInfo) => {
    console.log(`Building and pushing custom lambda image with repo uri ${projectInfo.repoUri} and name ${projectInfo.repoName}. Be patient, this might take a while!`);
    const res = execSync(`./docker_run.sh ${projectInfo.repoUri} ${projectInfo.repoName} ${projectInfo.region}`);
    console.log(res.toString()); // TODO remove?
};

const depsEqual = (oldDeps, newDeps) => {
    const oldDepsAsArrays = Object.entries(oldDeps).map(entry => entry[0] + entry[1]).sort();
    const newDepsAsArrays = Object.entries(newDeps).map(entry => entry[0] + entry[1]).sort();

    return oldDepsAsArrays.length === newDepsAsArrays.length &&
        oldDepsAsArrays.every((val, index) => val === newDepsAsArrays[index]);
};

const haveDependenciesChanged = (oldInfo, newInfo) => {
    const oldDependencies = oldInfo.allDependencies;
    const newDependencies = newInfo.allDependencies;

    if(oldDependencies.length !== newDependencies.length) {
        return true;
    }
    const oldSubProjectNames = oldDependencies.map(d => d.name);
    const newSubProjectNames = newDependencies.map(d => d.name);

    if(!oldSubProjectNames.every(old => newSubProjectNames.includes(old))) {
        return true;
    }

    oldDependencies.every(dep => {
        const correctNewDependencies = newDependencies.filter(d => d.name === dep.name).shift() || {};

        return !depsEqual(dep.dependencies, correctNewDependencies.dependencies)
            || !depsEqual(dep.devDependencies, correctNewDependencies.devDependencies)
    });

    return false;
};

const script = async (projectInfo) => {
    const updatedProjectInfo = {...projectInfo};

    if(projectInfo.firstRun) {
        const { bucketName, repoName, repoUri } = await deployBaseInfra(projectInfo);
        updatedProjectInfo.bucketName = bucketName;
        updatedProjectInfo.repoName = repoName;
        updatedProjectInfo.repoUri = repoUri;
    }

    const toIgnore = await getGitIgnoreList(projectInfo.path);
    copy(projectInfo.path, destinationDir, toIgnore);
    const allFiles = await getFiles(destinationDir, toIgnore);
    await modifyPackageJsons(destinationDir, allFiles);
    updatedProjectInfo.allDependencies = await gatherAllDependencies(allFiles);

    if(projectInfo.firstRun || haveDependenciesChanged(projectInfo, updatedProjectInfo)) {
        console.log('Changes to dependencies. Running install and updating docker image')
        runNpmInstall(allFiles);
        docker(updatedProjectInfo);
    } else {
        // TODO if no change - no npm install  or docker - just s3 upload
    }

    if(projectInfo.firstRun || haveDependenciesChanged(projectInfo, updatedProjectInfo)) {
        // TODO is this enough to get the most recent docker image in step function?
        const {stepFunctionArn} = await deploySfInfra(updatedProjectInfo);
        updatedProjectInfo.sfArn = stepFunctionArn;
        updatedProjectInfo.firstRun = false;
    }
    await startExecution(updatedProjectInfo);

    return updatedProjectInfo;
}

module.exports = {
    script,
};
