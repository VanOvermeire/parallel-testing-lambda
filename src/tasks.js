const {execSync} = require('child_process');

const {haveDependenciesChanged} = require("./helpers/dependencies");
const {startExecution} = require("./helpers/execution");
const {copy} = require("./helpers/fileHandlers");
const {getFiles, getGitIgnoreList, modifyPackageJsons, runNpmInstall, gatherAllDependencies} = require("./helpers/fileHandlers");
const {deployBaseInfra, deploySfInfra} = require("./helpers/deployer");

process.env.PATH = process.env.PATH + ':/usr/local/bin'; // TODO needed for execSync? test!

const currentDir = __dirname;
const destinationDir = `${currentDir}/application`; // TODO maybe specific - so we do not overwrite copies with one another

const docker = ({ repoUri, repoName, region, imageVersion}) => {
    console.log(`Building custom lambda image and pushing to ${repoUri}...`);
    execSync(
        `./docker_run.sh ${repoUri} ${repoName} ${region} ${imageVersion}`,
        // {stdio : 'pipe' } // TODO
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
    console.log('Creating necessary infrastructure and container. This might take a while!');
    const {bucketName, repoName, repoUri} = await deployBaseInfra(projectInfo.name, projectInfo.region);

    const allFiles = await prepareCopy(projectInfo.path)
        .then(buildCopy);
    const allDependencies = await gatherAllDependencies(allFiles);

    docker({repoUri, repoName, region: projectInfo.region, imageVersion: projectInfo.imageVersion});

    const {stepFunctionArn} = await deploySfInfra(projectInfo.name, projectInfo.region, repoUri, bucketName, projectInfo.imageVersion.toString());

    return {
        ...projectInfo,
        bucketName,
        repoName,
        repoUri,
        allDependencies,
        stepFunctionArn,
        imageVersion: projectInfo.imageVersion + 1,
    };
};

const runWithoutNewContainer = async (projectInfo) => {
    // TODO check the config for the files that have changed and pass those on to the execution
}

// TODO changes for infra, image version, etc.
const runWithNewContainer = async (projectInfo, allFiles) => {
    console.log('Changes to dependencies, need to update container');
    await buildCopy(allFiles);
    runNpmInstall(allFiles);
    docker(projectInfo);

    const {stepFunctionArn} = await deploySfInfra(projectInfo.name, projectInfo.region, projectInfo.repoUri);

    await startExecution(projectInfo);

    // TODO do we have to safe the new arn? maybe for the best
    return {
        ...projectInfo,
        stepFunctionArn,
    }
}

// TODO hide config files with . ?
const runTasks = async (projectInfo) => {
    // TODO before anything else, start watching file changes and saving this - maybe in separate file ({name}-changes.json)
    //  then offer to run tests and keep watching

    const allFiles = await prepareCopy(projectInfo.path);

    const newDependencies = await gatherAllDependencies(allFiles);

    if(haveDependenciesChanged(projectInfo.allDependencies, newDependencies)) {
        await runWithNewContainer(projectInfo, allFiles);
    } else {
        await runWithoutNewContainer(projectInfo);
    }

    return {
        ...projectInfo,
        allDependencies: newDependencies,
    };

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

// TODO remove
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
        console.log('No changes to dependencies detected.');
    }

    if(projectInfo.firstRun || dependenciesChanged) {
        const {stepFunctionArn} = await deploySfInfra(updatedProjectInfo);
        updatedProjectInfo.sfArn = stepFunctionArn;
        updatedProjectInfo.firstRun = false;
    }
    await startExecution(updatedProjectInfo, dependenciesChanged);

    return updatedProjectInfo;
}

module.exports = {
    script,
    runTasks,
    setupTasks,
};
