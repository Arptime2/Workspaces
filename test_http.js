const { frontToBack, backToFront } = require('./test_functions');

(async () => {
    await frontToBack('Test from test script');
    await backToFront('Test message from backend');
})();
