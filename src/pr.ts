import { GitHub } from "@actions/github/lib/utils.js";
import * as fs from "fs";
import { formatString, nixfDiagnose } from "./support.js";
import { PositionMap, getPositionOffsetMap } from "./github-diff.js";

export async function getComments(files: string[], positionMap: PositionMap) {
  const comments = await Promise.all(
    files.map(async (file) => {
      // Construct diagnostics from nixf-tidy.
      const diagnostics = await nixfDiagnose(fs.createReadStream(file));
      // Make PR review comments from diagnostics.
      return diagnostics.flatMap((diagnostic) => {
        const lCurLine = diagnostic.range.lCur.line + 1;
        if (positionMap.get(file)?.has(lCurLine)) {
          // Make comment at that line
          const line = positionMap.get(file)?.get(lCurLine);
          return [
            {
              path: file,
              position: line,
              body: formatString(diagnostic.message, ...diagnostic.args),
            },
          ];
        }
        return [];
      });
    }),
  );
  return comments.flat();
}

export async function reviewPR(
  octokit: InstanceType<typeof GitHub>,
  req: {
    owner: string;
    repo: string;
    pull_number: number;
  },
): Promise<void> {
  // Get diff from PRs
  const { data: diff } = await octokit.rest.pulls.get({
    ...req,
    mediaType: {
      format: "diff",
    },
  });

  const positionMap = getPositionOffsetMap(diff as unknown as string);

  const { data: changedFiles } = await octokit.rest.pulls.listFiles(req);

  const pattern = /.*\.nix$/;

  const changedNix = changedFiles
    .map((file) => file.filename)
    .filter((filename) => filename.match(pattern));

  if (changedNix.length == 0) {
  }

  const comments = await getComments(changedNix, positionMap);

  if (comments.length > 0) {
    octokit.rest.pulls.createReview({
      ...req,
      comments,
      event: "COMMENT",
    });
  } else {
    // Approve the PR if there are no comments.
    octokit.rest.pulls.createReview({
      ...req,
      event: "APPROVE",
    });
  }
}
