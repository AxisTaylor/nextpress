import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalTeardown() {
  console.log('Stopping WordPress backend...');
  try {
    await execAsync('npm run stop:wp-backend', { cwd: '../..' });
    console.log('WordPress backend stopped.');
  } catch (error) {
    // Ignore errors - server might already be stopped
    console.log('Note: WordPress backend may already be stopped.');
  }
}
