const fs = require('fs');
const path = require('path');

function collectWorkspaceData(ws, allWorkspaces, allBalls) {
    const nodes = ws.nodeIds.map(id => allBalls.find(b => b.id === id)).filter(b => b);
    const subWorkspaces = ws.workspaceIds.map(id => allWorkspaces.find(w => w.id === id)).filter(w => w);
    subWorkspaces.forEach(sub => {
        const subData = collectWorkspaceData(sub, allWorkspaces, allBalls);
        nodes.push(...subData.nodes);
    });
    return { nodes, subWorkspaces };
}

function saveWorkspaces(data) {
    const dir = path.join(__dirname, '../../Data/Workspaces');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Get top-level workspaces (not nested in others)
    const topLevelWorkspaces = data.workspaces.filter(ws =>
        !data.workspaces.some(other => other.workspaceIds.includes(ws.id))
    );

    topLevelWorkspaces.forEach(ws => {
        const { nodes, subWorkspaces } = collectWorkspaceData(ws, data.workspaces, data.balls);
        const saveData = {
            workspace: ws,
            subWorkspaces: subWorkspaces,
            nodes: nodes,
            scale: data.scale,
            panOffsetX: data.panOffsetX,
            panOffsetY: data.panOffsetY
        };
        const filename = ws.name.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
        const filePath = path.join(dir, filename);
        try {
            fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2));
        } catch (error) {
            console.error(`Error saving ${filename}:`, error);
        }
    });
}

function loadWorkspace(name) {
    const dir = path.join(__dirname, '../../Data/Workspaces');
    const filename = name.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return data;
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return null;
        }
    }
    return null;
}

module.exports = { saveWorkspaces, loadWorkspace };