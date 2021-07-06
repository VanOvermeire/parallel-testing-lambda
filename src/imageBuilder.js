const {startExecution} = require("./helpers/execution");
const {copy} = require("./helpers/fileHandlers");
const {execSync} = require('child_process');

const {getFiles, getGitIgnoreList, modifyPackageJsons, runNpmInstall, gatherAllDependencies} = require("./helpers/fileHandlers");
const {deployBaseInfra, deploySfInfra} = require("./helpers/deployer");

process.env.PATH = process.env.PATH + ':/usr/local/bin'; // needed for execSync

const currentDir = __dirname;
const destinationDir = `${currentDir}/application`;

const docker = (projectInfo) => {
    console.log(`Running docker build, tag, push with ${projectInfo.repoUri} and name ${projectInfo.repoName}. This might take a while`);
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

// TODO more changes needed to handle multiple projects (like stack names)
const script = async (projectInfo) => {
    const updatedProjectInfo = {...projectInfo};

    // if(projectInfo.firstRun) {
    //     const { bucketName, repoName, repoUri } = await deployBaseInfra(projectInfo);
    //     updatedProjectInfo.bucketName = bucketName;
    //     updatedProjectInfo.repoName = repoName;
    //     updatedProjectInfo.repoUri = repoUri;
    // }

    // const toIgnore = await getGitIgnoreList(projectInfo.path);
    // copy(projectInfo.path, destinationDir, toIgnore);
    // const allFiles = await getFiles(destinationDir, toIgnore);
    // await modifyPackageJsons(destinationDir, allFiles);
    // updatedProjectInfo.allDependencies = await gatherAllDependencies(allFiles);

    // if(projectInfo.firstRun || haveDependenciesChanged(projectInfo, updatedProjectInfo)) {
    //     console.log('have changed')
    //     runNpmInstall(allFiles);
    //     docker(updatedProjectInfo);
    // } else {
    //     console.log('have not changed')
    //     // TODO if no change - no npm install  or docker - just s3 upload
    // }

    // if(projectInfo.firstRun) {
    //     const {stepFunctionArn} = await deploySfInfra(updatedProjectInfo);
    //     updatedProjectInfo.sfArn = stepFunctionArn;
    //     updatedProjectInfo.firstRun = false;
    // }

    // and now the actual call...
    updatedProjectInfo.sfArn = 'arn:aws:states:eu-west-1:262438358359:stateMachine:StepFunction-9tHEyuA5aZ8O';
    await startExecution(updatedProjectInfo);

    return updatedProjectInfo;
}

// TODO remove
const exampleProjectInfo = {
    name: 'bff',
    region: 'eu-west-1',
    path: "/Users/vanovsa/Documents/vrt-oidc-client-bff",
    firstRun: true,
    allDependencies: [
        {
            name: 'autologin',
            dependencies: { 'fp-ts': '^2.8.3' },
            devDependencies: {}
        }
    ],
};

script(exampleProjectInfo)
    .then(res => {
        console.log(res)
    });

module.exports = {
    script,
};
