import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

export const productionDeploySteps = Object.freeze([
  Object.freeze({ id: "build", command: "pnpm", args: ["run", "build"] }),
  Object.freeze({
    id: "migrate",
    command: "pnpm",
    args: ["run", "db:migrate:remote"],
  }),
  Object.freeze({ id: "deploy", command: "wrangler", args: ["deploy"] }),
]);

export const builtDeploySteps = Object.freeze(productionDeploySteps.slice(1));

function runCommand({ id, command, args }) {
  console.log(`production deploy: ${id}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const outcome =
        signal === null ? `exit code ${code}` : `signal ${signal}`;
      reject(new Error(`${id} failed with ${outcome}`));
    });
  });
}

export async function runProductionDeploy({
  steps = productionDeploySteps,
  run = runCommand,
} = {}) {
  for (const step of steps) {
    await run(step);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const steps = process.argv.includes("--built")
      ? builtDeploySteps
      : productionDeploySteps;
    await runProductionDeploy({ steps });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
