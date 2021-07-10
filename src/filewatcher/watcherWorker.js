const {parentPort, workerData} = require("worker_threads");
const chokidar = require('chokidar');
const {addToChanges} = require("../helpers/config");

const eventsToWatch = ['add', 'change'];
const addToChangesForProject = addToChanges(workerData.name);

chokidar.watch(workerData.path, {
    persistent: true,
    ignoreInitial: true,
    ignored: ['**/.git/**', '**/node_modules/**', '**/.idea/**', '**/coverage/**'],
}).on('all', (event, path) => {
    // console.log(event, path);
    if(eventsToWatch.includes(event)) {
        addToChangesForProject(path).then(() => {
            parentPort.postMessage(path);
        });
    }
});
