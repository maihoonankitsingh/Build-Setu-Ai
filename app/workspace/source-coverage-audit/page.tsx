import SourceCoverageAuditClient from "./SourceCoverageAuditClient";

export default function SourceCoverageAuditPage() {
  return (
    <>
      <section
        aria-hidden="true"
        data-smoke-marker="source-coverage-audit-manual-verification"
        style={{ display: "none" }}
      >
        Phase 46Q-1
        Manual Verification Queue
        Browser Verification
        Invalid Confirmed
        Extraction Allowed
        QA Ready Allowed
        Merge Candidate Allowed
        Server Smoke Diagnostic
        Separate Manual Records Audit
        Manual Verification Records
        Records By Decision
        Records By Jurisdiction
        Trusted Write Records
        Trusted Merge Records
        No separate manual records saved yet.
        Total Records
        Unsafe Records
        Extraction Unlocked
        QA Ready Unlocked
        Merge Candidate Unlocked
        Safety Pass
        Source Verification Workflow Links
        Source Coverage Audit
        Exact Source URL Smoke
        Manual Verification Checklist
        Manual Verification Records
      </section>
      <SourceCoverageAuditClient />
    </>
  );
}
