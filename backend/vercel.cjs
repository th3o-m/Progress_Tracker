// Vercel Services entrypoint. The backend build bundles dependencies into
// vercel-app.cjs so the deployed function does not need external node_modules.
const { app } = require('./vercel-app.cjs');

module.exports = app;
