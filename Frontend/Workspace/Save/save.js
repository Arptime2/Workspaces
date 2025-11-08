function createNewNode(x = 100, y = 100, radius = 20, id, name = 'New Node', description = 'A newly created node', color = 'lightblue', labels = [], outgoing = [], systemPrompt = '', prompt = '', tokenCount = 0, contextLabels = [], contextCount = 0, nodeType = 'default') {
    const actualId = id && !window.balls.find(b => b.id === id) ? id : window.nextId++;
    console.log('Creating node at', x, y, 'id:', actualId);
    const newNode = new Node(x, y, radius, actualId);
    newNode.name = name;
    newNode.description = description;
    newNode.color = color;
    newNode.labels = labels;
    newNode.outgoing = outgoing;
    newNode.systemPrompt = systemPrompt;
    newNode.prompt = prompt;
    newNode.tokenCount = tokenCount;
    newNode.contextLabels = contextLabels;
    newNode.contextCount = contextCount;
    newNode.nodeType = nodeType;
    window.balls.push(newNode);
    console.log('Node created and pushed, balls length:', window.balls.length);
    return actualId;
}

function createNewWorkspace(x = 100, y = 100, width = 100, height = 100, id, name = 'New Workspace', description = 'A newly created workspace', nodeIds = [], workspaceIds = []) {
    const actualId = id && !window.workspaces.find(w => w.id === id) ? id : window.nextWorkspaceId++;
    console.log('Creating workspace at', x, y, 'id:', actualId, 'nodeIds:', nodeIds, 'workspaceIds:', workspaceIds);
    const newWorkspace = new Workspace(x, y, width, height, actualId, name, description, nodeIds, workspaceIds);
    newWorkspace.closed = false;
    window.workspaces.push(newWorkspace);
    console.log('Workspace created and pushed, workspaces length:', window.workspaces.length);
    return actualId;
}

function saveWorkspace(workspaceName) {
    const workspace = window.workspaces.find(ws => ws.name === workspaceName);
    if (!workspace) {
        console.error('Workspace not found:', workspaceName);
        return;
    }
    const data = {
        x: workspace.x,
        y: workspace.y,
        width: workspace.width,
        height: workspace.height,
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        nodeIds: workspace.nodeIds.map(id => { const ball = window.balls.find(b => b.id === id); return ball ? { name: ball.name, x: ball.x, y: ball.y } : null; }).filter(Boolean),
        workspaceIds: workspace.workspaceIds.map(id => { const ws = window.workspaces.find(w => w.id === id); return ws ? { name: ws.name, x: ws.x, y: ws.y } : null; }).filter(Boolean),
        closed: workspace.closed
    };
    const jsonString = JSON.stringify(data, null, 2);
    window.sendToBackend('save_workspace:' + JSON.stringify({ name: workspaceName, data: jsonString }));
}

function saveNode(nodeName) {
    const node = window.balls.find(ball => ball.name === nodeName);
    if (!node) {
        console.error('Node not found:', nodeName);
        return;
    }
    const data = {
        x: node.x,
        y: node.y,
        radius: node.radius,
        id: node.id,
        name: node.name,
        description: node.description,
        color: node.color,
        labels: node.labels,
        outgoing: node.outgoing,
        systemPrompt: node.systemPrompt,
        prompt: node.prompt,
        tokenCount: node.tokenCount,
        contextLabels: node.contextLabels,
        contextCount: node.contextCount,
        nodeType: node.nodeType
    };
    const jsonString = JSON.stringify(data, null, 2);
    window.sendToBackend('save_node:' + JSON.stringify({ name: nodeName, data: jsonString }));
}

window.pendingLoads = new Map();

function loadNode(nameOrId) {
    console.log('Loading node:', nameOrId);
    return new Promise((resolve) => {
        window.pendingLoads.set(String(nameOrId), resolve);
        window.sendToBackend('load_node:' + nameOrId);
        console.log('Sent load_node request for:', nameOrId);
    });
}

function loadWorkspace(workspaceName, recursive = false) {
    console.log('Loading workspace:', workspaceName, recursive ? 'recursively' : '');
    return new Promise((resolve) => {
        window.pendingLoads.set(workspaceName, resolve);
        window.sendToBackend('load_workspace:' + JSON.stringify({name: workspaceName, recursive}));
        console.log('Sent load_workspace request for:', workspaceName, 'recursive:', recursive);
    });
}

async function loadWorkspaceNewVersion(workspaceName, x = 100, y = 100) {
    window.repositionTarget = { name: workspaceName, x, y };
    await loadWorkspace(workspaceName, true);
}

window.handleLoadedMessage = async function(message) {
    console.log('handleLoadedMessage called with:', message);
    if (message.startsWith('loaded_node:')) {
        const payload = JSON.parse(message.slice('loaded_node:'.length));
        console.log('Loaded node data for:', payload.id);
        const data = JSON.parse(payload.data);
        if (window.replacingNode && data.name === window.replacingNode.newName) {
            // Replace the old node with the loaded one
            const oldNode = window.replacingNode.oldNode;
            // Delete old node
            window.balls = window.balls.filter(ball => ball !== oldNode);
            // Remove connections to old node
            window.balls.forEach(ball => {
                ball.outgoing = ball.outgoing.filter(id => id !== oldNode.id);
            });
            // Update workspaces
            window.workspaces.forEach(ws => {
                if (ws.nodeIds.includes(oldNode.id)) {
                    ws.nodeIds = ws.nodeIds.filter(id => id !== oldNode.id);
                    updateWorkspaceSize(ws);
                }
            });
            // Place loaded node at old position
            data.x = oldNode.x;
            data.y = oldNode.y;
            // Create the node
            const actualId = createNewNode(data.x, data.y, data.radius, data.id, data.name, data.description, data.color, data.labels, data.outgoing, data.systemPrompt, data.prompt, data.tokenCount, data.contextLabels, data.contextCount, data.nodeType);
            // Update workspaces for new node
            window.workspaces.forEach(ws => {
                if (isNodeInWorkspace(window.balls.find(b => b.id === actualId), ws) && !isNodeInAnyWorkspace(window.balls.find(b => b.id === actualId))) {
                    ws.nodeIds.push(actualId);
                    updateWorkspaceSize(ws);
                }
            });
            window.replacingNode = null;
            if (window.renameTimeout) {
                clearTimeout(window.renameTimeout);
                window.renameTimeout = null;
            }
            return;
        }
        if (window.currentOffset) {
            data.x += window.currentOffset.offsetX;
            data.y += window.currentOffset.offsetY;
        }
        // Removed panOffset additions for fixed coordinates
        data.outgoing = data.outgoing; // already ids
        const actualId = createNewNode(data.x, data.y, data.radius, data.id, data.name, data.description, data.color, data.labels, data.outgoing, data.systemPrompt, data.prompt, data.tokenCount, data.contextLabels, data.contextCount, data.nodeType);
        const keys = [data.name, String(payload.id)];
        keys.forEach(key => {
            const resolve = window.pendingLoads.get(key);
            if (resolve) {
                resolve(actualId);
            }
        });
    } else if (message.startsWith('loaded_workspace:')) {
        const payload = JSON.parse(message.slice('loaded_workspace:'.length));
        console.log('Loaded workspace data for:', payload.id);
        const data = JSON.parse(payload.data);
        console.log('Received loaded_workspace for:', data.name, 'recursive:', payload.recursive);
        if (window.replacingWorkspace && data.name === window.replacingWorkspace.newName) {
            // Replace the old workspace with the loaded one
            const oldWorkspace = window.replacingWorkspace.oldWorkspace;
            // Set reposition target to center the new workspace in the old workspace's area, in screen coordinates
            const centeredWorldX = oldWorkspace.x + (oldWorkspace.width - data.width) / 2;
            const centeredWorldY = oldWorkspace.y + (oldWorkspace.height - data.height) / 2;
            window.repositionTarget = { name: data.name, x: centeredWorldX - window.panOffsetX, y: centeredWorldY - window.panOffsetY };
            // Delete old workspace and all children
            const toDelete = getAllChildWorkspaces(oldWorkspace);
            toDelete.push(oldWorkspace);
            window.workspaces = window.workspaces.filter(ws => !toDelete.includes(ws));
            // Delete nodes in them
            const nodesToDelete = [];
            toDelete.forEach(ws => {
                ws.nodeIds.forEach(id => {
                    if (!nodesToDelete.includes(id)) nodesToDelete.push(id);
                });
            });
            window.balls = window.balls.filter(ball => !nodesToDelete.includes(ball.id));
            // Remove connections to deleted nodes
            window.balls.forEach(ball => {
                ball.outgoing = ball.outgoing.filter(id => !nodesToDelete.includes(id));
            });
            // Update remaining workspaces
            window.workspaces.forEach(ws => {
                ws.nodeIds = ws.nodeIds.filter(id => !nodesToDelete.includes(id));
                ws.workspaceIds = ws.workspaceIds.filter(id => !toDelete.some(del => del.id === id));
                updateWorkspaceSize(ws);
            });
            window.replacingWorkspace = null;
            if (window.renameTimeout) {
                clearTimeout(window.renameTimeout);
                window.renameTimeout = null;
            }
        }
        if (window.repositionTarget && data.name === window.repositionTarget.name) {
            const offsetX = window.repositionTarget.x - data.x;
            const offsetY = window.repositionTarget.y - data.y;
            window.currentOffset = { offsetX, offsetY };
            data.x = window.repositionTarget.x;
            data.y = window.repositionTarget.y;
            window.repositionTarget = null;
        } else if (window.currentOffset) {
            data.x += window.currentOffset.offsetX;
            data.y += window.currentOffset.offsetY;
        }
        // Removed panOffset additions for fixed coordinates
        if (payload.recursive) {
            console.log('About to load nodes:', data.nodeIds);
            const loadedNodeIds = await Promise.all(data.nodeIds.map(async (item) => {
                const id = await loadNode(item.name);
                const ball = window.balls.find(b => b.id === id);
                if (ball) {
                    ball.x = item.x + (window.currentOffset?.offsetX || 0);
                    ball.y = item.y + (window.currentOffset?.offsetY || 0);
                }
                return id;
            }));
            console.log('Loaded node ids:', loadedNodeIds);
            console.log('About to load workspaces:', data.workspaceIds);
            const loadedWorkspaceIds = await Promise.all(data.workspaceIds.map(async (item) => {
                const id = await loadWorkspace(item.name, true);
                const ws = window.workspaces.find(w => w.id === id);
                if (ws) {
                    ws.x = item.x + (window.currentOffset?.offsetX || 0);
                    ws.y = item.y + (window.currentOffset?.offsetY || 0);
                }
                return id;
            }));
            console.log('Loaded workspace ids:', loadedWorkspaceIds);
            // Removed panOffset additions for fixed coordinates
            data.nodeIds = loadedNodeIds;
            data.workspaceIds = loadedWorkspaceIds;
            console.log('Creating workspace with nodeIds:', data.nodeIds, 'workspaceIds:', data.workspaceIds);
            const actualId = createNewWorkspace(data.x, data.y, data.width, data.height, data.id, data.name, data.description, data.nodeIds, data.workspaceIds);
            console.log('Workspace created, id:', actualId);
            const ws = window.workspaces[window.workspaces.length - 1];
            updateWorkspaceSize(ws);
            const keys = [data.name];
            keys.forEach(key => {
                const resolve = window.pendingLoads.get(key);
                if (resolve) {
                    resolve(actualId);
                }
            });
        } else {
            // Removed panOffset additions for fixed coordinates
            const loadedNodeIds = await Promise.all(data.nodeIds.map(async (item) => {
                const id = await loadNode(item.name);
                const ball = window.balls.find(b => b.id === id);
                if (ball) {
                    ball.x = item.x + (window.currentOffset?.offsetX || 0);
                    ball.y = item.y + (window.currentOffset?.offsetY || 0);
                }
                return id;
            }));
            data.nodeIds = loadedNodeIds;
            data.workspaceIds = data.workspaceIds.map(item => {
                const ws = window.workspaces.find(w => w.name === item.name);
                if (ws) {
                    ws.x = item.x + (window.currentOffset?.offsetX || 0);
                    ws.y = item.y + (window.currentOffset?.offsetY || 0);
                }
                return ws?.id;
            }).filter(Boolean);
            const actualId = createNewWorkspace(data.x, data.y, data.width, data.height, data.id, data.name, data.description, data.nodeIds, data.workspaceIds);
            const ws = window.workspaces[window.workspaces.length - 1];
            updateWorkspaceSize(ws);
            const keys = [data.name];
            keys.forEach(key => {
                const resolve = window.pendingLoads.get(key);
                if (resolve) {
                    resolve(actualId);
                }
            });
        }
    }
};

function updateRelativePosition(name, id) {
    const item = window.balls.find(b => b.id === id) || window.workspaces.find(w => w.id === id);
    if (!item) {
        console.error('Item not found for updateRelativePosition:', name, id);
        return;
    }
    // Find direct parent
    let parent = null;
    if (item.constructor.name === 'Node') {
        // Find smallest workspace containing the node and having it in nodeIds
        for (let ws of window.workspaces) {
            if (isNodeInWorkspace(item, ws) && ws.nodeIds.includes(item.id)) {
                if (!parent || ws.width * ws.height < parent.width * parent.height) {
                    parent = ws;
                }
            }
        }
    } else { // workspace
        for (let ws of window.workspaces) {
            if (ws !== item && isWorkspaceInWorkspace(item, ws) && ws.workspaceIds.includes(item.id)) {
                if (!parent || ws.width * ws.height < parent.width * parent.height) {
                    parent = ws;
                }
            }
        }
    }
    if (!parent) {
        console.log('No parent found for item:', name, id);
        return; // no parent
    }
    const relX = item.x - parent.x;
    const relY = item.y - parent.y;
    // Now find all others with same name, different id
    const allItems = [...window.balls, ...window.workspaces];
    const matchingItems = allItems.filter(i => i.name === name && i.id !== id);
    matchingItems.forEach(other => {
        // Find their parent
        let otherParent = null;
        if (other.constructor.name === 'Node') {
            for (let ws of window.workspaces) {
                if (isNodeInWorkspace(other, ws) && ws.nodeIds.includes(other.id)) {
                    if (!otherParent || ws.width * ws.height < otherParent.width * otherParent.height) {
                        otherParent = ws;
                    }
                }
            }
        } else {
            for (let ws of window.workspaces) {
                if (ws !== other && isWorkspaceInWorkspace(other, ws) && ws.workspaceIds.includes(other.id)) {
                    if (!otherParent || ws.width * ws.height < otherParent.width * otherParent.height) {
                        otherParent = ws;
                    }
                }
            }
        }
        if (otherParent && otherParent.name === parent.name) {
            other.x = otherParent.x + relX;
            other.y = otherParent.y + relY;
            // Save
            if (other.constructor.name === 'Node') {
                saveNode(other.name);
            } else {
                saveWorkspace(other.name);
            }
        }
    });
    // Also save the original
    if (item.constructor.name === 'Node') {
        saveNode(item.name);
    } else {
        saveWorkspace(item.name);
    }
}