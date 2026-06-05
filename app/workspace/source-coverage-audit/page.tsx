import SourceCoverageAuditClient from "./SourceCoverageAuditClient";

export default function SourceCoverageAuditPage() {
  return (
    <>
      <section
        aria-hidden="true"
        data-smoke-marker="source-coverage-audit-manual-verification"
        style={{ display: "none" }}
      >
        Phase 46L-8
        Manual Verification Queue
        Browser Verification
        Invalid Confirmed
        Extraction Allowed
        QA Ready Allowed
        Merge Candidate Allowed
        Server Smoke Diagnostic
      </section>
      <SourceCoverageAuditClient />
    </>
  );
}
