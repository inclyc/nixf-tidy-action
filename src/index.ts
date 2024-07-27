// Entrypoint of the action.

import * as github from "@actions/github";
import { reviewPR } from "./pr.js";
import { exit } from "process";

const pr = github.context.payload.pull_request?.number;
if (pr === undefined) {
  console.log("nixf-tidy action can only work with PRs");
  exit(0);
}

const { GITHUB_TOKEN } = process.env;

await reviewPR(github.getOctokit(GITHUB_TOKEN!), {
  ...github.context.repo,
  pull_number: pr,
});
