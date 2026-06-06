# BuildSetu Source Review Pipeline Handover

Generated: 2026-06-06T06:54:47Z

## Latest Commit
```text
f6e3f12 Add source review pipeline handover report
```

## Recent Commits
```text
f6e3f12 Add source review pipeline handover report
96598c0 Record source watch sync and review queue generated state
64730da Add debug audit for official source review actions
aecc622 Auto refresh source review pipeline status
2ec5744 Add source review pipeline status card to knowledge inbox
970241b Record source review pipeline status
c406647 Preserve official review queue metadata during sync
ff9180f Record review action safety test for source candidate
a1e9071 Add review queue filter and search UI
a458af7 Polish pending exact source candidate review UI
3a0940e Sync official source review queue from web candidates
bf448be Show web source candidates in official review queue
eb2abd3 Polish web update source review UI states
230735a Add web search save as source candidate UI
5ea2e5b Load persisted source reviews in project chat UI
```

## Live URLs
- Knowledge Inbox: https://build.sikhadenge.in/workspace/knowledge-inbox
- Official Source Review Queue: https://build.sikhadenge.in/workspace/official-source-review-queue
- Candidate Capture API: https://build.sikhadenge.in/api/agent-knowledge/web-search-candidate-capture

## Cron
```text
17 */6 * * * cd /var/www/build.sikhadenge.in/sikhadenge-build && /usr/bin/flock -n /tmp/buildsetu-source-watch.lock /bin/bash -lc '/usr/bin/node scripts/buildsetu-source-pack-sync.mjs >> /tmp/buildsetu-source-watch-cron.log 2>&1; /usr/bin/node scripts/buildsetu-source-watch-check.mjs >> /tmp/buildsetu-source-watch-cron.log 2>&1 || true; /usr/bin/node scripts/buildsetu-source-watch-fetch-recover.mjs >> /tmp/buildsetu-source-watch-cron.log 2>&1; /usr/bin/node scripts/buildsetu-source-watch-quality-gate.mjs >> /tmp/buildsetu-source-watch-cron.log 2>&1; /usr/bin/node scripts/buildsetu-source-watch-inbox.mjs >> /tmp/buildsetu-source-watch-cron.log 2>&1; /usr/bin/node scripts/buildsetu-source-review-pipeline-status.mjs >> /tmp/buildsetu-source-watch-cron.log 2>&1' # BUILDSETU_SOURCE_WATCH_CRON
```

## Pipeline Status
```json
{
  "ok": true,
  "generatedAt": "2026-06-06T06:51:42.691Z",
  "phase": "47B-2R",
  "title": "BuildSetu source watch, web-search candidate capture, and review queue pipeline status",
  "routes": {
    "webSearch": "/api/agent-tools/web-search",
    "webSearchCandidateCapture": "/api/agent-knowledge/web-search-candidate-capture",
    "pendingExactSourceCandidates": "/api/agent-knowledge/pending-exact-source-candidates",
    "officialSourceReviewQueue": "/api/agent-knowledge/official-source-review-queue",
    "reviewQueuePage": "/workspace/official-source-review-queue",
    "knowledgeInboxPage": "/workspace/knowledge-inbox"
  },
  "sourceWatch": {
    "registeredTrustedSourceAutoWatch": true,
    "latestInboxGeneratedAt": "2026-06-06T06:51:42.646Z",
    "watchSourceCount": null,
    "pendingSourceUpdateDrafts": 0,
    "latestChangedSources": 1,
    "latestFailedSources": 7,
    "fetchRecovery": {
      "recoveredCount": 1,
      "unresolvedCount": 7
    },
    "qualityGate": {
      "scannedDrafts": 15,
      "quarantinedCount": 1,
      "keptPendingCount": 0
    }
  },
  "webDiscovery": {
    "openWebSearchAutoRunsInCron": false,
    "candidateCaptureReady": true,
    "trustedKnowledgeAutoMerge": false
  },
  "candidateQueue": {
    "totalCandidates": 26,
    "byDecision": {
      "web_search_candidate_saved_needs_review": 1,
      "candidate_saved_needs_review": 25
    },
    "byJurisdiction": {
      "India": 1,
      "Uttarakhand": 1,
      "Tripura": 1,
      "Sikkim": 1,
      "Punjab": 1,
      "Puducherry": 1,
      "Odisha": 1,
      "Nagaland": 1,
      "Mizoram": 1,
      "Meghalaya": 1,
      "Manipur": 1,
      "Lakshadweep": 1,
      "Ladakh": 1,
      "Kerala": 1,
      "Jharkhand": 1,
      "Jammu and Kashmir": 1,
      "Himachal Pradesh": 1,
      "Goa": 1,
      "Dadra and Nagar Haveli and Daman and Diu": 1,
      "Chhattisgarh": 1,
      "Chandigarh": 1,
      "Bihar": 1,
      "Assam": 1,
      "Arunachal Pradesh": 1,
      "Andhra Pradesh": 1,
      "Andaman and Nicobar Islands": 1
    },
    "latestCandidate": {
      "sourceId": "smoke-test-web-search-ui_bis.gov.in_bis-national-building-code",
      "title": "BIS National Building Code",
      "url": "https://www.bis.gov.in/standards/technical-department/national-building-code/",
      "decision": "web_search_candidate_saved_needs_review",
      "confidence": "medium_official_domain_needs_review"
    }
  },
  "reviewQueue": {
    "updatedAt": "2026-06-06T06:46:50.206Z",
    "sourceCandidateCount": 78,
    "itemCount": 78,
    "byStatus": {
      "pending_review": 76,
      "approved": 1,
      "rejected": 1
    },
    "bySourcePackId": {
      "official_core_building_codes_india": 3,
      "planning_dimensions_pack": 3,
      "construction_materials_execution_pack": 2,
      "state_local_approval_bylaws_pack": 8,
      "pending_exact_source_candidates": 51,
      "all_india_state_ut_authority_index_pack": 11
    },
    "pendingExactSourceCandidateItems": 51,
    "rejectedItems": 1,
    "approvedItems": 1,
    "pendingReviewItems": 76
  },
  "safety": {
    "sourceRegistryChanged": false,
    "extractionAllowedChanged": false,
    "qaReadyAllowedChanged": false,
    "trustedMergeCandidateAllowedChanged": false,
    "trustedKnowledgeWrite": false,
    "trustedKnowledgeChanged": false,
    "trustedMergeExecuted": false,
    "mergeActionAvailable": false,
    "autoMerge": false,
    "mergePolicy": "manual_review_required"
  },
  "nextRecommendedPhase": "47B-2S: add quick refresh action/status card update on Knowledge Inbox if needed"
}
```

## Current Counts
- Candidate queue total: 26
- Review queue total: 78
- Pending exact candidates: 51
- Pending review items: 76
- Approved items: 1
- Rejected items: 1

## Safety
```json
{
  "sourceRegistryChanged": false,
  "extractionAllowedChanged": false,
  "qaReadyAllowedChanged": false,
  "trustedMergeCandidateAllowedChanged": false,
  "trustedKnowledgeWrite": false,
  "trustedKnowledgeChanged": false,
  "trustedMergeExecuted": false,
  "mergeActionAvailable": false,
  "autoMerge": false,
  "mergePolicy": "manual_review_required"
}
```

## Completed
- Source-watch cron active
- Fetch recovery active
- Quality gate active
- Inbox regeneration active
- Web-search candidate capture active
- Review queue sync active
- Review queue filter/search UI active
- Knowledge Inbox status card active
- Pipeline status auto-refresh active
- Trusted merge/write blocked
