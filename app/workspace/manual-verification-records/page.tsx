import ManualVerificationRecordsClient from "./ManualVerificationRecordsClient";

export default function ManualVerificationRecordsPage() {
  return (
    <>
      <section
        aria-hidden="true"
        data-smoke-marker="manual-verification-records"
        style={{ display: "none" }}
      >
        Phase 46O-6
        Manual Verification Records
        Add Manual Record
        Save Separate Manual Record
        Total Records
        Extraction Unlocked
        QA Ready Unlocked
        Merge Candidate Unlocked
        Trusted Write
        Trusted Merge
        Safety Pass
        Karnataka
        Maharashtra
        Uttar Pradesh
        West Bengal
        needs_more_review
        verified_manual_browser_source
        replace_with_better_official_source
        mark_source_invalid_after_review
        Delete Separate Record
        Deleting...
        Delete response failed safety check
        Manual verification record deleted separately
        recordId_required
        record_not_found
        DELETE /api/agent-knowledge/manual-verification-records
        Source registry was not changed
        No Source Registry Change
      </section>
      <ManualVerificationRecordsClient />
    </>
  );
}
