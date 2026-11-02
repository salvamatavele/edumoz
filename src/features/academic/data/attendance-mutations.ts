export class AttendanceMutationError extends Error {
  constructor(readonly code: "submitted" | "alreadyOpen" | "forbidden" | "invalid") {
    super(code);
    this.name = "AttendanceMutationError";
  }
}
