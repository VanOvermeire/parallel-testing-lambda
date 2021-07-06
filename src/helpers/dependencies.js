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

module.exports = {
    haveDependenciesChanged,
};
