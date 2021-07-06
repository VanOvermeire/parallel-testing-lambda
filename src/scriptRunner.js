const {execSync} = require('child_process');

const {haveDependenciesChanged} = require("./helpers/dependencies");
const {startExecution} = require("./helpers/execution");
const {copy} = require("./helpers/fileHandlers");
const {getFiles, getGitIgnoreList, modifyPackageJsons, runNpmInstall, gatherAllDependencies} = require("./helpers/fileHandlers");
const {deployBaseInfra, deploySfInfra} = require("./helpers/deployer");

process.env.PATH = process.env.PATH + ':/usr/local/bin'; // needed for execSync

const currentDir = __dirname;
const destinationDir = `${currentDir}/application`;

const docker = (projectInfo) => {
    console.log(`Building and pushing custom lambda image with repo uri ${projectInfo.repoUri} and name ${projectInfo.repoName}. Be patient, this might take a while!`);
    execSync(`./docker_run.sh ${projectInfo.repoUri} ${projectInfo.repoName} ${projectInfo.region}`);
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
    const dependenciesChanged = haveDependenciesChanged(projectInfo, updatedProjectInfo);

    if(projectInfo.firstRun || dependenciesChanged) {
        console.log('Changes to dependencies. Running install and updating docker image')
        runNpmInstall(allFiles);
        docker(updatedProjectInfo);
    } else {
        // TODO if no change - no npm install  or docker - just s3 upload
        console.log('No changes to dependencies detected.');
    }

    if(projectInfo.firstRun || dependenciesChanged) {
        // TODO is this enough to get the most recent docker image in step function?
        const {stepFunctionArn} = await deploySfInfra(updatedProjectInfo);
        updatedProjectInfo.sfArn = stepFunctionArn;
        updatedProjectInfo.firstRun = false;
    }
    await startExecution(updatedProjectInfo, dependenciesChanged);

    return updatedProjectInfo;
}

module.exports = {
    script,
};
