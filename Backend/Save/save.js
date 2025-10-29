const fs = require('fs');
const path = require('path');

const WORKSPACES_PATH = path.join(__dirname, '../../Data/Workspaces');
const NODES_PATH = path.join(__dirname, '../../Data/Nodes');

function saveWorkspace(name, data) {
    console.log('Saving workspace:', name);
    const fileName = `workspaces_${name}.json`;
    const filePath = path.join(WORKSPACES_PATH, fileName);
    fs.writeFileSync(filePath, data);
}

function saveNode(name, data) {
    console.log('Saving node:', name);
    const fileName = `nodes_${name}.json`;
    const filePath = path.join(NODES_PATH, fileName);
    fs.writeFileSync(filePath, data);
}

function loadNode(name) {
    console.log('Loading node:', name);
    const fileName = `nodes_${name}.json`;
    const filePath = path.join(NODES_PATH, fileName);
    if (fs.existsSync(filePath)) {
        console.log('Node file found, sending data');
        const data = fs.readFileSync(filePath, 'utf8');
        global.sendToFrontend('loaded_node:' + JSON.stringify({ name, data }));
    } else {
        console.log('Node file not found');
    }
}

function loadWorkspace(name) {
    console.log('Loading workspace:', name);
    const fileName = `workspaces_${name}.json`;
    const filePath = path.join(WORKSPACES_PATH, fileName);
    if (fs.existsSync(filePath)) {
        console.log('Workspace file found, sending data');
        const data = fs.readFileSync(filePath, 'utf8');
        global.sendToFrontend('loaded_workspace:' + JSON.stringify({ name, data }));
    } else {
        console.log('Workspace file not found');
    }
}

module.exports = { saveWorkspace, saveNode, loadWorkspace, loadNode };