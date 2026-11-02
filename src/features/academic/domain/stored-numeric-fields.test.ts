import { describe, expect, it } from "vitest";
import { recordGradesSchema } from "./grade-schema";
import { createAssessmentSchema } from "./assessment-entry-schema";
import { createAssessmentSchemeSchema } from "./assessment-scheme-schema";
import { createFeeItemSchema } from "@/features/finance/domain/fee-schedule-schema";

const assessment = { teachingGroupId: "group", termId: "term", componentId: "component", name: "Test", maxScore: 20, weight: 1, date: "2026-02-02" };
const scheme = { name: "Scheme", regime: "WITH_ASSESSMENT", scaleMin: 0, scaleMax: 20, passMark: 10, roundingMode: "HALF_UP", decimalPlaces: 2, hasExam: false, examWeight: 0, components: [{ code: "AT", name: "Test", type: "TEST", weight: 1 }] };
describe("numeric inputs match the stored decimal precision", () => {
  it.each([10.001, 999.999, Infinity])("refuses a grade that would be rounded or overflow: %s", (score) => {
    expect(recordGradesSchema.safeParse({ assessmentId: "test", changes: [{ enrollmentId: "pupil", score, isAbsent: false }] }).success).toBe(false);
  });
  it.each([0, 12.34, 999.99])("preserves an exact two-decimal grade: %s", (score) => {
    expect(recordGradesSchema.parse({ assessmentId: "test", changes: [{ enrollmentId: "pupil", score, isAbsent: false }] }).changes[0].score).toBe(score);
  });
  it("does not silently change the assessment maximum or its weighting", () => {
    expect(createAssessmentSchema.safeParse({ ...assessment, maxScore: 20.001 }).success).toBe(false);
    expect(createAssessmentSchema.safeParse({ ...assessment, weight: 0.12345 }).success).toBe(false);
    expect(createAssessmentSchema.safeParse({ ...assessment, weight: 0.1234 }).success).toBe(true);
  });
  it("does not accept rounding precision that exceeds the saved result", () => {
    expect(createAssessmentSchemeSchema.safeParse({ ...scheme, decimalPlaces: 3 }).success).toBe(false);
    expect(createAssessmentSchemeSchema.safeParse({ ...scheme, decimalPlaces: 1000000 }).success).toBe(false);
    expect(createAssessmentSchemeSchema.safeParse(scheme).success).toBe(true);
  });
  it("does not silently round scheme thresholds or component weights", () => {
    expect(createAssessmentSchemeSchema.safeParse({ ...scheme, passMark: 9.999 }).success).toBe(false);
    expect(createAssessmentSchemeSchema.safeParse({ ...scheme, components: [{ ...scheme.components[0], weight: 0.66666 }] }).success).toBe(false);
  });
  it("requires fee amounts to fit Decimal(12,2)", () => {
    const fee = { feeScheduleId: "schedule", code: "PROP", name: "Fee", amount: 100, recurrence: "MONTHLY", isMandatory: true };
    expect(createFeeItemSchema.safeParse({ ...fee, amount: 0.001 }).success).toBe(false);
    expect(createFeeItemSchema.safeParse({ ...fee, amount: 10000000000 }).success).toBe(false);
    expect(createFeeItemSchema.safeParse({ ...fee, amount: 9999999999.99 }).success).toBe(true);
  });
});
