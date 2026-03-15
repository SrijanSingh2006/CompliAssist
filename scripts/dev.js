import { spawn } from 'node:child_process';

const children = [];
let shuttingDown = false;

function runProcess(command) {
  const child = spawn(command, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  children.push(child);

  child.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    if (code && code !== 0) {
      process.exitCode = code;
    }

    for (const runningChild of children) {
      if (!runningChild.killed) {
        runningChild.kill();
      }
    }
  });
}

process.on('SIGINT', () => {
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
});

runProcess('npm run dev:server');
runProcess('npm run dev:client');
