const {Worker} = require("worker_threads");
const inquirer = require('inquirer');
const worker = new Worker("./watcherWorker.js", {});

let changes= undefined; // or just look in config

const q = [
    {
        type: 'input',
        name: 'run',
        message: 'Run tests again?',
        default: 'true'
    },
]

function askQuestion() {
    inquirer.prompt(q).then(ans => {
        if (ans.run === 'true') {
            console.log('Checking...')
            if (changes) {
                console.log('Changes found');
                // run
                console.log('ran tests');
            } else {
                console.log('no changes!');
            }
            askQuestion()
        } else {
            console.log('Stopping');
            process.exit(0);
        }
    });
}

function setup() {
    // console.log('in master');

    worker.on("message", result => {
        // console.log('found and uploaded');
        // console.log(result)
        changes = result;
    });

    worker.on("error", error => {
        console.log(error);
    });

    worker.on("exit", exitCode => {
        console.log(exitCode);
    })

    console.log("Watcher set up");

    askQuestion();
}

setup()


// inquirer.prompt(second).then(res => {
//     console.log(res)
//     console.log(res.stop)
//     if(res.stop === 'true') {
//         console.log('ok')
//     } else {
//         inquirer.prompt(second).then(console.log)
//     }
// });
