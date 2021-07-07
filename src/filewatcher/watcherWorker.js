const {parentPort} = require("worker_threads");
const chokidar = require('chokidar');

function uploadToS3(key) {
    // console.log('upload ' + key)
    return Promise.resolve({});
}

async function addToConfig(key) {
    // console.log('add ' + key)
    return Promise.resolve({});
}

// console.log('in worker! start watching');
chokidar.watch('/Users/vanovsa/Documents/vrt-oidc-client-bff', {
    persistent: true,
    ignoreInitial: true,
    ignored: ['**/.git', '**/node_modules', '**/.idea', '**/coverage'],
}).on('all', (event, path) => {
    // console.log('changed')
    // console.log(event, path); // add versus change // change /Users/vanovsa/Documents/vrt-oidc-client-bff/lambdas/autologin/src/index.ts
    // console.log('processing')
    Promise.all([uploadToS3(path), addToConfig(path)]).then(() => {
        parentPort.postMessage(path);
    });
});

// TODO
//  if a normal file changed, upload it to s3 and save the change somewhere? then download in container upon invocation
//  if package json AND dep change, new docker is needed

