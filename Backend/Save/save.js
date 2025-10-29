const fs = require('fs');
const path = require('path');

const WORKSPACES_PATH = path.join(__dirname, '../../Data/Workspaces');
const NODES_PATH = path.join(__dirname, '../../Data/Nodes');

function saveWorkspace(name, data) {
    const fileName = `workspaces_${name}.json`;
    const filePath = path.join(WORKSPACES_PATH, fileName);
    fs.writeFileSync(filePath, data);
}

function saveNode(name, data) {
    const fileName = `nodes_${name}.json`;
    const filePath = path.join(NODES_PATH, fileName);
    fs.writeFileSync(filePath, data);
}

module.exports = { saveWorkspace, saveNode };