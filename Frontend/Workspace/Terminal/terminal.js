document.addEventListener('DOMContentLoaded', () => {
    const input = document.createElement('input');
    input.id = 'terminal-input';
    input.type = 'text';
    input.placeholder = 'Enter command...';
    input.style.position = 'fixed';
    input.style.bottom = '0';
    input.style.left = '0';
    input.style.width = '100%';
    input.style.height = '3%';
    input.style.background = 'black';
    input.style.color = 'white';
    input.style.border = 'none';
    input.style.outline = 'none';
    input.style.fontFamily = 'monospace';
    input.style.fontSize = '12px';
    input.style.padding = '0 5px';
    input.style.boxSizing = 'border-box';
    document.body.appendChild(input);

    let expectingInput = false;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const value = input.value.trim();
            if (value) {
                if (!expectingInput) {
                    window.terminalHistory.push('$ ' + value);
                    window.sendToBackend('execute:' + value);
                    expectingInput = true;
                } else {
                    window.sendToBackend('input:' + value);
                    window.terminalHistory.push(value);
                }
                input.value = '';
            }
        }
    });

    // Listen for output
    window.onMessageFromBackend = (message) => {
        if (message.startsWith('output:')) {
            const result = message.slice(7);
            const lines = result.split('\n');
            window.terminalHistory.push(...lines);
        } else if (message === 'command_done') {
            expectingInput = false;
        }
    };
});