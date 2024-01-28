let fs = require('fs')

// Read the current version from module.json
const moduleData = JSON.parse(fs.readFileSync('./module.json', 'utf8'));
const currentVersion = moduleData.version;

// Increment the version by 0.1
const newVersion = (parseFloat(currentVersion) + 0.1).toFixed(1);

// Update the version in module.json
moduleData.version = newVersion;
fs.writeFileSync('./module.json', JSON.stringify(moduleData, null, 2));

console.log(JSON.parse(fs.readFileSync('./module.json', 'utf8')).version)