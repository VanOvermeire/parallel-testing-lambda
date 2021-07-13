const {execSync} = require('child_process');
const {copy, gatherAllRunLocations, getFiles, getGitIgnoreList, modifyPackageJsons, runNpmInstall, gatherAllDependencies} = require("./helpers/fileHandlers");
const {uploadChangesToS3} = require("./helpers/s3");
const {resetCurrentChanges, setChangesToUploaded} = require("./helpers/config");
const {haveDependenciesChanged} = require("./helpers/dependencies");
const {startExecution} = require("./helpers/execution");
const {deployBaseInfra, deploySfInfra} = require("./helpers/deployer");

process.env.PATH = process.env.PATH + ':/usr/local/bin'; // TODO needed for execSync? check!

const currentDir = __dirname;
const destinationDir = `${currentDir}/application`; // TODO make more specific? so we do not overwrite copies with one another... Other solution: delete application copy

const docker = ({ repoUri, repoName, region, imageVersion}) => {
    console.log(`Building custom lambda image and pushing to ${repoUri}...`);
    execSync(
        `./docker_run.sh ${repoUri} ${repoName} ${region} ${imageVersion}`,
        {stdio : 'pipe' }
    );
};

const prepareCopy = async (path) => {
    const toIgnore = await getGitIgnoreList(path);
    copy(path, destinationDir, toIgnore);

    return await getFiles(destinationDir, toIgnore);
}

const buildCopy = async (allFiles) => {
    await modifyPackageJsons(destinationDir, allFiles);
    runNpmInstall(allFiles);

    return allFiles;
}

const setupTasks = async (projectInfo) => {
    console.log('Creating or updating infrastructure and container. This might take a while!');
    const {bucketName, repoName, repoUri} = await deployBaseInfra(projectInfo.name, projectInfo.region);

    const allFiles = await prepareCopy(projectInfo.path)
        .then(buildCopy);
    const locations = gatherAllRunLocations(destinationDir)(allFiles);
    const allDependencies = await gatherAllDependencies(allFiles);

    docker({repoUri, repoName, region: projectInfo.region, imageVersion: projectInfo.imageVersion});

    const {stepFunctionArn} = await deploySfInfra(projectInfo.name, projectInfo.region, repoUri, bucketName, projectInfo.imageVersion.toString());

    await resetCurrentChanges(projectInfo.name); // needed when updating - there might be a changes file

    return {
        ...projectInfo,
        bucketName,
        repoName,
        repoUri,
        locations,
        allDependencies,
        stepFunctionArn,
        imageVersion: projectInfo.imageVersion + 1,
    };
};

const runWithoutNewContainer = async (projectInfo, changes) => {
    const keys = await uploadChangesToS3(projectInfo, changes);
    await setChangesToUploaded(projectInfo.name);
    await startExecution(projectInfo, keys);
    return projectInfo;
}

const runWithNewContainer = async (projectInfo, allFiles) => {
    console.log('Changes to dependencies, need to update container');
    await buildCopy(allFiles);
    runNpmInstall(allFiles);
    docker(projectInfo);

    const {stepFunctionArn} = await deploySfInfra(projectInfo.name, projectInfo.region, projectInfo.repoUri);

    await startExecution(projectInfo);

    return {
        ...projectInfo,
        stepFunctionArn,
    }
}

const runTasks = async (projectInfo, changes) => {
    const changesToPackageJson = Object.keys(changes).some(k => k.endsWith('package.json'));

    if(changesToPackageJson) {
        const allFiles = await prepareCopy(projectInfo.path);
        const locations = gatherAllRunLocations(destinationDir)(allFiles);
        const newDependencies = await gatherAllDependencies(allFiles);

        if(haveDependenciesChanged(projectInfo.allDependencies, newDependencies)) {
            await runWithNewContainer(projectInfo, allFiles);
            await resetCurrentChanges(projectInfo.name);

            return {
                ...projectInfo,
                locations,
                allDependencies: newDependencies,
            }
        }
    }
    return await runWithoutNewContainer(projectInfo, changes);

    // const updatedProjectInfo = {...projectInfo};
    //
    // const toIgnore = await getGitIgnoreList(projectInfo.path);
    // copy(projectInfo.path, destinationDir, toIgnore);
    // const allFiles = await getFiles(destinationDir, toIgnore);
    // await modifyPackageJsons(destinationDir, allFiles);

    // updatedProjectInfo.allDependencies = await gatherAllDependencies(allFiles);
    // const dependenciesChanged = haveDependenciesChanged(projectInfo, updatedProjectInfo);
    //
    // if(dependenciesChanged) {
    //     console.log('Changes to dependencies. Running install and updating docker image')
    //     runNpmInstall(allFiles);
    //     docker(updatedProjectInfo);
    // }
    // // else {
    //     // console.log('No changes to dependencies detected.');
    // // }
    //
    // if(dependenciesChanged) {
    //     const {stepFunctionArn} = await deploySfInfra(projectInfo.name, projectInfo.region, projectInfo.repoUri);
    //     updatedProjectInfo.sfArn = stepFunctionArn;
    //     updatedProjectInfo.firstRun = false;
    // }
    // await startExecution(updatedProjectInfo, dependenciesChanged);
    //
    // return updatedProjectInfo;
}

module.exports = {
    runTasks,
    setupTasks,
};
