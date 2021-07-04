const {runNpmInstall} = require("./helpers/fileHandlers");
const {getGitIgnoreList} = require("./helpers/fileHandlers");
const {execSync} = require('child_process');

const {getFiles} = require("./helpers/fileHandlers");
const {CONTAINER_NAME} = require("./helpers/constants");
const {deployBaseInfra, deploySfInfra} = require("./helpers/deployer");

process.env.PATH = process.env.PATH + ':/usr/local/bin'; // needed for execSync

const currentDir = __dirname;
const destinationDir = `${currentDir}/application`;

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

const script = async (projectInfo) => {
    const updatedProjectInfo = {...projectInfo};

    // if(projectInfo.firstRun) {
    //     const { bucketName, repoName } = await deployBaseInfra(projectInfo);
    //     updatedProjectInfo.bucketName = bucketName;
    //     updatedProjectInfo.repoName = repoName;
    // }

    const toIgnore = await getGitIgnoreList(projectInfo.path);
    // before copy first delete the application dir
    // copy(projectInfo.path, destinationDir, toIgnore);
    const allFiles = await getFiles(destinationDir, toIgnore);
    runNpmInstall(allFiles);
    // await modifyPackageJsons(destinationDir, allFiles);
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
