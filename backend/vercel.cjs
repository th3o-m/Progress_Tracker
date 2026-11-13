// Vercel Services entrypoint. The backend build bundles dependencies into
// dist/vercel-app.cjs so the deployed function does not need external node_modules.
const { app } = require('./dist/vercel-app.cjs');

module.exports = app;
