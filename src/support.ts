import { Readable } from "stream";
import * as consumers from "stream/consumers";
import { Diagnostic, Range } from "./nixf-types.js";
import { spawn } from "child_process";

export function toGithubRange(range: Range) {
  return {
    startLine: range.lCur.line + 1,
    startColumn: range.lCur.column + 1,
    endLine: range.rCur.line + 1,
    endColumn: range.rCur.column + 1,
  };
}

/**
 * Diagnose some file using nixf-tody.
 * The process will be spawned from "PATH" environment.
 *
 * @param file The file to analyze
 * @returns Diagnostics reported by nixf
 */
export async function nixfDiagnose(file: Readable): Promise<Diagnostic[]> {
  // Spawn nixf-tidy from "PATH".
  const nixf_tidy = spawn("nixf-tidy", ["--variable-lookup"]);

  // Pipe the file contents to nixf-tidy process.
  file.pipe(nixf_tidy.stdin);

  return (await consumers.json(nixf_tidy.stdout)) as Diagnostic[];
}

/**
 * Format libnixf template strings. It uses "{}" as the placeholder.
 * @param template the template string, provided by libnixf
 * @param args arguments to replace
 * @returns formatted string
 */
export function formatString(template: string, ...args: string[]): string {
  return template.replace(/{}/g, () => args.shift() || "");
}
