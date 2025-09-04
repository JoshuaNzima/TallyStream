import serverless from 'serverless-http';
import app from '../../dist/index.js';

export const handler = serverless(app);