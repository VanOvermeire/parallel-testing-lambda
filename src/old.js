// const readPackageJsonFiles = async (packageJsonList) => {
//     return Promise.all(packageJsonList.map(p => fsPromises.readFile(p)))
// }
//
// const combine = (acc, curr) => {
//     acc = {...acc, ...curr};
//     return acc;
// };
//
// const buffersToObjects = (buffers) => buffers.map(b => JSON.parse(b.toString()));

// const gatherAllDevDependencies = async (packageJsonList) => {
//     return readPackageJsonFiles(packageJsonList)
//         .then(buffersToObjects)
//         .then(results => results
//                 .map(r => r.devDependencies)
//                 .reduce(combine));
// };
//
// const gatherAllDependencies = async (packageJsonList) => {
//     return readPackageJsonFiles(packageJsonList)
//         .then(buffersToObjects)
//         .then(results => results
//                 .map(r => r.dependencies)
//                 .reduce(combine));
// }

// // could ignore aws-sdk
// const createPackageJson = async () => {
//     const list = ['', '/lambdas/autologin', '/lambdas/login', '/util/cookies', '/util/encryption']; // TODO should also be gathered from given project (do not look into node_modules)
//     const packageJsonList = list.map(loc => `${repoLocation}${loc}/package.json`);
//     console.log(packageJsonList)
//
//     const deps = await Promise.all([gatherAllDependencies(packageJsonList), gatherAllDevDependencies(packageJsonList)]);
//     console.log(deps)
//
//     const currentPackage = await fsPromises.readFile('./originalPackage.json');
//     console.log(currentPackage.toString())
//     const currentAsObject = JSON.parse(currentPackage.toString());
//
//     const newP = {...currentAsObject, dependencies: { ...currentAsObject.dependencies, ...deps[0] }, devDependencies: { ...currentAsObject.devDependencies, ...deps[1] } };
//     console.log(newP)
//
//     await fsPromises.writeFile('./package.json', JSON.stringify(newP));
// }
