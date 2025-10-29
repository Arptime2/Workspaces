function createNewNode(x = 100, y = 100, radius = 20, name = 'New Node', description = 'A newly created node', color = 'lightblue', labels = [], outgoing = [], systemPrompt = '', prompt = '', tokenCount = 0, contextLabels = [], contextCount = 0, nodeType = 'default') {
    const newNode = new Node(x, y, radius, window.nextId++);
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
}

function createNewWorkspace(x = 200, y = 200, width = 100, height = 100, name = 'New Workspace', description = 'A newly created workspace', nodeIds = [], workspaceIds = []) {
    const newWorkspace = new Workspace(x, y, width, height, window.nextWorkspaceId++, name, description, nodeIds, workspaceIds);
    newWorkspace.closed = false;
    window.workspaces.push(newWorkspace);
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
        nodeIds: workspace.nodeIds,
        workspaceIds: workspace.workspaceIds,
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