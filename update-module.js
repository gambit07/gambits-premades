const fs = require('fs');
const path = require('path');

const version = process.argv[2];

if (!version) {
    console.error('No version specified');
    process.exit(1);
}

const moduleJsonPath = path.join(__dirname, 'module.json');

fs.readFile(moduleJsonPath, 'utf8', (err, data) => {
    if (err) {
        console.error(`Error reading module.json: ${err}`);
        return;
    }

    let moduleJson;
    try {
        moduleJson = JSON.parse(data);
    } catch (err) {
        console.error(`Error parsing module.json: ${err}`);
        return;
    }

    moduleJson.version = version;
    moduleJson.manifest = `https://github.com/gambit07/gambits-premades/releases/download/${version}/module.json`;
    moduleJson.download = `https://github.com/gambit07/gambits-premades/releases/download/${version}/module.zip`;

    fs.writeFile(moduleJsonPath, JSON.stringify(moduleJson, null, 2), 'utf8', (err) => {
        if (err) {
            console.error(`Error writing module.json: ${err}`);
            return;
        }

        console.log(`module.json successfully updated to version ${version}`);
    });
});