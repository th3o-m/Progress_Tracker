/// <reference path="./types/express.d.ts" />

import { app } from './app.js'; import { env } from './config/env.js';
const server = app.listen(env.PORT, () => console.log(`API listening on port ${env.PORT}`));
function shutdown(signal: string): void { console.log(`${signal} received; shutting down`); server.close(() => process.exit(0)); }
process.on('SIGTERM', () => shutdown('SIGTERM')); process.on('SIGINT', () => shutdown('SIGINT'));
