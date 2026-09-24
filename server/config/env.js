import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Load the server configuration even when a script is launched from another folder.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
