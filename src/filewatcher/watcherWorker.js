const {parentPort} = require("worker_threads");
const chokidar = require('chokidar');
const {writeChangesFile} = require("../helpers/config");

// function uploadToS3(key) {
//     // console.log('upload ' + key)
//     return Promise.resolve({});
// }

async function addToConfig(key) {
    // console.log('add ' + key)
    return await writeChangesFile(key);
}

chokidar.watch('/Users/vanovsa/Documents/vrt-oidc-client-bff', {
    persistent: true,
    ignoreInitial: true,
    ignored: ['**/.git', '**/node_modules', '**/.idea', '**/coverage'],
}).on('all', (event, path) => {
    // console.log(event, path); // add versus change // change /Users/vanovsa/Documents/vrt-oidc-client-bff/lambdas/autologin/src/index.ts
    addToConfig(path).then(() => {
        parentPort.postMessage(path);
    });
});
