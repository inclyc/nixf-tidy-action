function getFileName(lineText: string) {
  // diff --git a/force-app/main/default/classes/MyClass.cls b/force-app/main/default/classes/MyClass.cls
  return lineText.split(" ")[3].substring(2);
}

function getStartLineNumber(lineText: string) {
  // @@ -35,16 +35,16 @@ private class MyClassTest {
  return parseInt(lineText.split(" ")[2].split(",")[0].substring(1));
}

export type PositionMap = Map<string, Map<number, number>>;

/**
 * GitHub requires all PRs review based on funny "diff" line numbers. Let's deal with it.
 */
export function getPositionOffsetMap(diffData: string): PositionMap {
  let currentFileName: undefined | string;
  let lines = diffData.split("\n");
  let positionOffset = 1;
  let currentLineNumber = 0;
  let insideHunkHeader = false;
  let result = new Map();

  lines.forEach((line) => {
    // New file.
    if (line.startsWith("diff --git")) {
      let newHunkFileName = getFileName(line);
      if (!currentFileName || newHunkFileName !== currentFileName) {
        currentFileName = newHunkFileName;
        positionOffset = 1;
        insideHunkHeader = true;
        return;
      }
    }
    // New hunk.
    if (line.startsWith("@@")) {
      // Reset the absolute line number based on hunk header info.
      currentLineNumber = getStartLineNumber(line);
      // Leave the chunk header
      insideHunkHeader = false;
      return;
    }
    if (insideHunkHeader) {
      return;
    }
    if (line.startsWith("-")) {
      positionOffset++;
      return;
    }
    let lineMap = result.has(currentFileName)
      ? result.get(currentFileName)
      : new Map();
    lineMap.set(currentLineNumber++, positionOffset++);
    result.set(currentFileName, lineMap);
  });
  return result;
}
