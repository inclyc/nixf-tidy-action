export interface Location {
  line: number;
  column: number;
  offset: number;
}

export interface Range {
  lCur: Location;
  rCur: Location;
}

export interface PartialDiagnostic {
  range: Range;
  tags: number[];
  args: string[];
}

export interface Note extends PartialDiagnostic {
  kind: number;
  sname: string;
  message: string;
}

export interface Diagnostic extends PartialDiagnostic {
  kind: number;
  message: string;
  range: Range;
  severity: 0 | 1 | 2 | 3 | 4;
  sname: string;
  notes: Note[];
  // TODO: support fixes.
}
