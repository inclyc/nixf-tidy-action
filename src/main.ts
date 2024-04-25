import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import { exec as execCallback } from "child_process";
import { promisify } from "util";
import { exit } from "process";

const { GITHUB_TOKEN } = process.env;

const exec = promisify(execCallback);

interface Location {
  line: number;
  column: number;
  offset: number;
}

interface Range {
  lCur: Location;
  rCur: Location;
}

interface PartialDiagnostic {
  range: Range;
  tags: number[];
  args: string[];
}

interface Note extends PartialDiagnostic {
  kind: number;
  sname: string;
  message: string;
}

interface Diagnostic extends PartialDiagnostic {
  kind: number;
  message: string;
  range: Range;
  severity: 0 | 1 | 2;
  sname: string;
  notes: Note[];
  // TODO: support fixes.
}

function toGithubRange(range: Range) {
  return {
    startLine: range.lCur.line + 1,
    startColumn: range.lCur.column + 1,
    endLine: range.rCur.line + 1,
    endColumn: range.rCur.column + 1,
  };
}

/**
 * Format libnixf template strings. It uses "{}" as the placeholder.
 * @param template the template string, provided by libnixf
 * @param args arguments to replace
 * @returns formatted string
 */
function formatString(template: string, ...args: string[]): string {
  return template.replace(/{}/g, () => args.shift() || '');
}

async function nixfTidy(changedNix: string[]): Promise<boolean> {
  let clean = true
  await Promise.all(
    changedNix.map(async (file) => {
      // Read the file, and use it for stdin.
      const contents = await fs.promises.readFile(file);

      // Run nixf-tidy.
      const child = exec("nixf-tidy --variable-lookup");
      child.child.stdin?.write(contents);
      child.child.stdin?.end();

      const { stdout } = await child;

      console.log(stdout);

      // Parse stdout, it is a json.
      const obj: Diagnostic[] = JSON.parse(stdout);

      if (obj.length > 0)
        clean = false

      // Obj should be a list, iterate it.
      obj.forEach((diagnostic) => {
        // "Element" are diagnostics
        const properties: core.AnnotationProperties = {
          file,
          title: formatString(diagnostic.message, ...diagnostic.args),
          ...toGithubRange(diagnostic.range),
        };
        switch (diagnostic.severity) {
          case 0:
          case 1:
            core.error(
              `nixf-tidy detected error on your code: ${diagnostic.sname}`,
              properties,
            );
            break;
          case 2:
            core.warning(
              `nixf-tidy detected warning on your code: ${diagnostic.sname}`,
              properties,
            );
            break;
        }

        // Also add the notes.
        diagnostic.notes.forEach((note) => {
          // Make the note.
          const properties: core.AnnotationProperties = {
            file,
            title: formatString(note.message, ...note.args),
            ...toGithubRange(note.range),
          };
          core.notice(`note: ${note.sname}`, properties);
        });
      });
    }),
  );
  return clean
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function runOnPR(req: {
  owner: string;
  repo: string;
  pull_number: number;
}): Promise<void> {
  const octokit = github.getOctokit(GITHUB_TOKEN!);
  const response = await octokit.rest.pulls.listFiles(req);

  const changedFiles = response.data;

  const pattern = /.*\.nix$/;

  const changedNix = changedFiles
    .map((file) => file.filename)
    .filter((filename) => filename.match(pattern));

  if (changedNix.length == 0) {
    console.log("No Nix files changed...");
    process.exit(0);
  }

  if (!await nixfTidy(changedNix)) {
    process.exit(3);
  }
}

export async function run() {
  const pr = github.context.payload.pull_request?.number;
  if (pr === undefined) {
    console.log("can only handle PRs");
    exit(-1);
  }

  runOnPR({ ...github.context.repo, pull_number: pr });
}
