# CertiFlow — Database Schema Design

**Status:** Approved decisions incorporated — **awaiting implementation approval**  
**Scope:** Relational model, constraints, relationships, and operational rules only  
**Out of scope until explicit approval:** Prisma models, migrations, SQL DDL, application code  

This design aligns with `docs/architecture.md`, `docs/api-documentation.md`, and the confirmed business decisions below. PostgreSQL types and naming are chosen to map cleanly to Prisma later (`Uuid`, `String`, `Int`, `Boolean`, `DateTime`, enums, JSON).

---

## 0. Confirmed decisions versus assumptions

### Confirmed (approved)

| Topic | Decision |
| ----- | -------- |
| Candidate identity | Use a stable **registration identifier** when available. **Never** auto-merge via fuzzy name/phone matching. Define explicit behaviour when registration id is missing (see §4.8). |
| Certificate numbering | Format `CF-YYYY-{UNIQUE_IDENTIFIER}`; `YYYY` = issuance year; suffix = generated unique id; **global uniqueness** via DB unique constraint. |
| Quality review | Threshold **50** candidates; value is **configurable**; freeze the applied threshold decision on **BatchVersion submit**. |
| Returned batch | Training centre edits a **working draft**; resubmission creates a **new immutable BatchVersion**; prior approvals remain historical and do not count; never silently mutate submitted versions’ content. |
| State approval | **One** state officer approval sufficient for MVP; design remains extensible for future dual-control. |
| AI chat | Store sessions + messages in **PostgreSQL**; minimize PII; isolate from approval decisions. |
| OutboxEvent | Included in **initial** database design and first migration. |
| Certificate vs delivery | Separate **CertificateStatus** (validity) from **DeliveryStatus** (WhatsApp). Validity must not depend on delivery. |
| Certificate FKs | Prefer deriving batch/version/candidate via `BatchCandidate`; avoid redundant Certificate FKs unless justified. |
| Approvals | Decision rows are **immutable**; authorized corrections use a separate override mechanism that preserves originals + audit. |
| Outbox fields | Include `attempt_count`, `available_at`, `published_at`, `processed_at`, `last_error`, `locked_at`; publication and processing timestamps remain separate. |
| Concurrency | Preserve transaction-based protection for approvals, submit/resubmit, certificate issuance, and outbox creation. |
| PostgreSQL constraints | Prisma models will define supported constraints and relationships. Partial unique indexes and CHECK constraints not expressible in Prisma schema will be added through custom SQL in version-controlled Prisma migration files and retained in every migration history. |
| Returned-batch candidate identity | Preserve each existing candidate_id when copying a returned BatchVersion into BatchWorkingDraft. Never recreate or fuzzy-match identities during resubmission. |
| Registration ID uniqueness | No uniqueness is assumed initially. A future programme-wide uniqueness rule or training-centre-specific uniqueness rule may be enabled only after source-system owner approval. |

### Assumptions (not elevated to new business requirements)

| Topic | Assumption |
| ----- | ---------- |
| District approvals | Still **≥ 2 distinct** district officers per version (from prior approved rules). |
| Quality approvals | **1** quality approval when `requires_quality_review = true`. |
| Stage requirement counts | Stored frozen on each submitted `BatchVersion` (`district_approvals_required`, etc.) so future dual-control can raise state requirement without rewriting history. |
| CertificateStatus values | `PENDING_GENERATION` \| `ISSUED` \| `CANCELLED` — validity for public verification. |
| DeliveryStatus values | `NOT_STARTED` \| `PENDING` \| `DELIVERED` \| `FAILED` — operational only. |
| Registration id source | External programme registration / enrolment id from import when present; exact source system naming left to implementation config. |
| Registration id uniqueness | No uniqueness is assumed initially. A future programme-wide uniqueness rule or training-centre-specific uniqueness rule may be enabled only after source-system owner approval. |
| Unique suffix in certificate number | UUID without hyphens (or equivalent high-entropy token), not a sequential counter (avoids centralized sequence contention). |
| Draft model | One editable **BatchWorkingDraft** (+ draft candidates) per Batch; submitted versions are content-immutable. |
| Approval correction authority | Restricted to authorized elevated roles (e.g. `STATE_OFFICER` / `ADMIN`); exact permission matrix left to auth implementation. |
| AI analysis blob storage | Prefer `raw_response_ref` pointer over large inline transcripts when responses are large. |

### Remaining unresolved questions

1. Exact **registration identifier** field name/format from source spreadsheets.
   - Whether it is unique across the programme or only within a training centre remains unconfirmed.
   - Until confirmed, `registration_id` remains nullable and has no global or centre-specific uniqueness constraint.
   - Alternative future configurations are: programme-wide uniqueness on `candidates.registration_id`, or centre-aware uniqueness using each candidate's training-centre association. Neither configuration is silently applied now.
2. Whether public verification uses `certificate_number` only, or also a separate `verification_code`.
3. Maximum retention period for candidate PII, AI chat content, and delivery attempt payloads/hashes.
4. Whether draft candidate rows may reference provisional candidate records that are later linked when a registration id appears on a later import (**recommendation:** still no auto-merge; manual admin linking would be a future feature if needed).
5. Precise RBAC matrix for who may create `ApprovalCorrection` records.

---

## 1. Design principles

1. **Database constraints are the last line of defence** against duplicate approvals and duplicate certificates.
2. **Submitted BatchVersion is the unit of review.** Approvals, submitted candidate snapshots, AI analysis, and quality gates attach to that version.
3. **Working draft ≠ submitted version.** Centres edit drafts; submit/resubmit copies into a new immutable version snapshot.
4. **Append-only / immutable decision history** for approvals (plus explicit corrections), delivery attempts, audit logs, AI findings, and AI chat messages.
5. **AI is advisory.** AI tables never participate in approval state machines as decision authorities.
6. **PII minimization.** Candidate contact data is operational; public verification must not expose it; AI chat content is scrubbed where feasible.
7. **Idempotent side effects.** Certificate creation and WhatsApp delivery jobs must be safe to retry.
8. **Certificate validity ≠ delivery outcome.** Cancellation and authenticity depend only on `CertificateStatus`.

### Naming conventions (Prisma-friendly)

| Concern | Convention |
| ------- | ---------- |
| Table names | Prefer **snake_case** tables mapped from Prisma models |
| Primary keys | `id UUID` (`gen_random_uuid()`) |
| Foreign keys | `<entity>_id` |
| Timestamps | `created_at`, `updated_at` (`TIMESTAMPTZ`) |
| Soft deletes | Prefer status flags; audit logs and approvals never deleted |
| Enums | PostgreSQL / Prisma enums |

## 1.1 PostgreSQL constraints and migration retention

- Prisma models will define supported constraints and relationships directly in the Prisma schema.
- PostgreSQL-specific constructs not expressible in Prisma schema, including partial unique indexes and CHECK constraints, must be added through custom SQL in Prisma migration files.
- These custom SQL constraints must remain in version-controlled migration history and be present in every fresh migration deployment.
- A migration review must verify that the deployed PostgreSQL schema includes each documented custom constraint even when it is absent from the Prisma schema representation.
- Partial or conditional uniqueness may be used only for explicitly approved business rules. No registration-ID uniqueness is assumed initially.

---

## 2. Updated ER relationship diagram

```text
District 1────────────* TrainingCentre
District 1────────────* User                 (district officers)
TrainingCentre 1──────* User                 (centre operators)
TrainingCentre 1──────* Batch
Course 1──────────────* Batch

Batch 1───────────────* BatchVersion         (submitted / content-immutable snapshots)
Batch 1───────────────0..1 BatchWorkingDraft (editable; at most one active draft per batch)
BatchWorkingDraft 1───* BatchDraftCandidate
BatchDraftCandidate *─1 Candidate?           (nullable until identity resolved — see §4.6)

BatchVersion 1────────* BatchCandidate       (frozen snapshot for that version)
Candidate 1───────────* BatchCandidate
BatchVersion 1────────* Approval             (immutable rows)
Approval 0..1─────────* ApprovalCorrection   (authorized overrides; originals preserved)
User 1────────────────* Approval
User 1────────────────* ApprovalCorrection

BatchCandidate 1──────0..1 Certificate
Certificate 1─────────* DeliveryAttempt

BatchVersion 1────────* AiAnalysis
AiAnalysis 1──────────* AiFinding
AiFinding 1───────────* AiFindingFeedback
User 1────────────────* AiChatSession
AiChatSession 1───────* AiChatMessage

User 1────────────────* AuditLog
OutboxEvent              (initial migration; async side effects)
```

### Cardinality summary

| From | To | Cardinality | Notes |
| ---- | -- | ----------- | ----- |
| District | TrainingCentre | 1 : N | |
| District | User | 1 : N | District officers scoped to district |
| TrainingCentre | User | 1 : N | |
| TrainingCentre | Batch | 1 : N | |
| Course | Batch | 1 : N | |
| Batch | BatchVersion | 1 : N | Each submit/resubmit adds one |
| Batch | BatchWorkingDraft | 1 : 0..1 | Editable workspace |
| BatchWorkingDraft | BatchDraftCandidate | 1 : N | |
| BatchVersion | BatchCandidate | 1 : N | Immutable membership snapshot |
| Candidate | BatchCandidate | 1 : N | |
| BatchVersion | Approval | 1 : N | Version-scoped |
| Approval | ApprovalCorrection | 1 : N | Original approval never rewritten |
| BatchCandidate | Certificate | 1 : 0..1 | |
| Certificate | DeliveryAttempt | 1 : N | |
| BatchVersion | AiAnalysis | 1 : N | |
| AiAnalysis | AiFinding | 1 : N | |
| AiFinding | AiFindingFeedback | 1 : N | |
| User | AiChatSession | 1 : N | |
| AiChatSession | AiChatMessage | 1 : N | |

---

## 3. Working draft versus immutable BatchVersion

This section is normative for returned-batch behaviour.

### Model

| Concept | Storage | Mutable content? | Approvals attach? |
| ------- | ------- | ---------------- | ----------------- |
| **BatchWorkingDraft** | `batch_working_drafts` + `batch_draft_candidates` | **Yes** (centre edits) | **No** |
| **BatchVersion** (submitted) | `batch_versions` + `batch_candidates` | **Content frozen** after submit; workflow `status` may change | **Yes** |

### Rules

1. Creating a batch creates (or lazily creates) a working draft.
2. Training centres add/edit/remove **draft** candidates only.
3. When a returned `BatchVersion` is copied into `BatchWorkingDraft`, copy every existing `BatchCandidate.candidate_id` into the corresponding `BatchDraftCandidate.candidate_id` reference. Preserve registration, PII, and other editable values as draft copies only.
   - The existing `candidates` row and the previous `BatchCandidate` snapshot must not be recreated or rewritten.
   - Candidate details may be edited only in the working-draft copies.
   - If authorized application behavior resolves or updates an existing candidate record from the working draft, previous `BatchCandidate` snapshots must remain unchanged because their membership and identity fields are immutable.
4. **Submit (first time) / Resubmit (after return):**
   - In one transaction: lock batch; validate draft; insert new `BatchVersion` with next `version_number`; create new immutable `BatchCandidate` records referencing the preserved `candidate_id` values; freeze quality fields; set version status into review; sync `batches.current_*`; write audit; optionally clear or retain draft for further edits only after a later return.
   - A resubmission may not reuse the previous `BatchCandidate` row. It must create a new row for the new version, even when the candidate identity is unchanged.
5. **Previously submitted versions are never content-edited** (no silent updates to candidate rows, counts, or frozen threshold flags).
6. When a version is **RETURNED**, officers’ approvals on that version remain as history. The centre continues editing the **working draft** created from the returned snapshot. Resubmission creates version `N+1`; counting approvals uses only `batch_version_id` of `N+1`.
7. Candidate identity must never be inferred or merged automatically from name, phone, date of birth, or other fuzzy similarities. Same-person linking requires an explicit, non-fuzzy identity rule or future manual administrative workflow.
````markdown
## 4. Entity catalogue (final)

### 4.1 Users and Roles

#### Purpose

Authenticate actors and authorize workflow actions. Role is the primary RBAC attribute; district / centre FKs enforce data scoping.

#### Columns

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `email` | `CITEXT` / `VARCHAR(320)` | NO | Login identifier |
| `password_hash` | `VARCHAR(255)` | NO | bcrypt/Argon2 |
| `full_name` | `VARCHAR(200)` | NO | |
| `role` | `user_role` | NO | enum |
| `district_id` | `UUID` | YES | Required for `DISTRICT_OFFICER` |
| `training_centre_id` | `UUID` | YES | Required for `TRAINING_CENTRE` |
| `is_active` | `BOOLEAN` | NO | default true |
| `last_login_at` | `TIMESTAMPTZ` | YES | |
| `created_at` | `TIMESTAMPTZ` | NO | |
| `updated_at` | `TIMESTAMPTZ` | NO | |

**Enum `user_role`:** `TRAINING_CENTRE` | `DISTRICT_OFFICER` | `QUALITY_OFFICER` | `STATE_OFFICER` | `ADMIN`

#### Constraints and indexes

- **PK:** `id`
- **Unique:** `email`
- **FK:** `district_id → districts.id`; `training_centre_id → training_centres.id`
- **Check:** role/FK presence rules for district officer and training centre
- **Indexes:** `(role, is_active)`; `(district_id)`; `(training_centre_id)`

#### District-scoped authorization

- District officers may only act on batches where `batches.district_id = users.district_id`.
- Prefer enforcing with service checks **and** queries that always filter by district; optional DB view for officer work queues.
- `district_id` on `batches` is denormalized from the training centre at creation and must match `training_centres.district_id` (application sets both; check constraint or trigger optional).

---

### 4.2 Districts

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `code` | `VARCHAR(32)` | NO | |
| `name` | `VARCHAR(200)` | NO | |
| `state_name` | `VARCHAR(120)` | NO | |
| `is_active` | `BOOLEAN` | NO | default true |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | NO | |

- **Unique:** `code`
- **Indexes:** `(is_active)`, `(name)`

---

### 4.3 Training Centres

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `district_id` | `UUID` | NO | FK |
| `code` | `VARCHAR(64)` | NO | |
| `name` | `VARCHAR(255)` | NO | |
| `contact_email` | `VARCHAR(320)` | YES | |
| `contact_phone` | `VARCHAR(32)` | YES | E.164 |
| `is_active` | `BOOLEAN` | NO | default true |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | NO | |

- **Unique:** `code`
- **FK:** `district_id → districts.id`
- **Indexes:** `(district_id)`, `(is_active)`

---

### 4.4 Course (supporting — initial migration)

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `code` | `VARCHAR(64)` | NO | |
| `name` | `VARCHAR(255)` | NO | |
| `description` | `TEXT` | YES | |
| `is_active` | `BOOLEAN` | NO | default true |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | NO | |

- **Unique:** `code`

---

### 4.5 Batches

#### Purpose

Stable logical container across resubmissions. Points at current submitted version and owns at most one working draft.

#### Columns

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `batch_number` | `VARCHAR(64)` | NO | Human-visible unique id |
| `training_centre_id` | `UUID` | NO | FK |
| `course_id` | `UUID` | NO | FK |
| `district_id` | `UUID` | NO | Denormalized for district scoping/query |
| `created_by_user_id` | `UUID` | NO | FK |
| `current_version_id` | `UUID` | YES | FK → current submitted version; null only before first submit |
| `current_version_number` | `INT` | NO | `0` before first submit; else mirrors current version |
| `current_status` | `batch_status` | NO | Must stay consistent with current version status after submit |
| `row_version` | `INT` | NO | Optimistic concurrency; default 1 |
| `created_at` | `TIMESTAMPTZ` | NO | |
| `updated_at` | `TIMESTAMPTZ` | NO | |

**Enum `batch_status`:**  
`DRAFT` | `SUBMITTED` | `DISTRICT_REVIEW` | `QUALITY_REVIEW` | `STATE_REVIEW` | `APPROVED` | `ISSUING` | `ISSUED` | `RETURNED` | `REJECTED`

#### Constraints and indexes

- **Unique:** `batch_number`
- **FK:** centre, course, district, creator; `current_version_id → batch_versions.id` (nullable)
- **Check:** `current_version_number >= 0`; `row_version >= 1`
- **Indexes:** `(training_centre_id, current_status)`; `(district_id, current_status)`; `(current_status, updated_at)`; `(course_id)`

#### Batch ↔ BatchVersion status consistency

- After first submit, `batches.current_version_id` / `current_version_number` / `current_status` must mirror the current submitted version’s identity and `status`.
- Updates to version workflow status and batch denormalized status occur in the **same transaction**.
- Historical versions retain their terminal or prior statuses (e.g. an older version remains `RETURNED` while current is `DISTRICT_REVIEW`).

---

### 4.6 Batch Working Draft (editable)

#### Purpose

Mutable workspace for the training centre. Not reviewable by officers until copied into a submitted `BatchVersion`.

#### `batch_working_drafts`

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `batch_id` | `UUID` | NO | FK; **unique** (one draft per batch) |
| `notes` | `TEXT` | YES | |
| `updated_by_user_id` | `UUID` | YES | FK |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | NO | |

#### `batch_draft_candidates`

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `working_draft_id` | `UUID` | NO | FK |
| `row_number` | `INT` | NO | |
| `registration_id` | `VARCHAR(64)` | YES | Stable id when available |
| `candidate_id` | `UUID` | YES | Set when linked to a `candidates` row |
| `full_name` | `VARCHAR(200)` | NO | Draft capture fields |
| `phone_e164` | `VARCHAR(32)` | YES | PII |
| `email` | `VARCHAR(320)` | YES | PII |
| `date_of_birth` | `DATE` | YES | |
| `payload` | `JSONB` | YES | Sanitized import remainder |
| `created_at` | `TIMESTAMPTZ` | NO | |
| `updated_at` | `TIMESTAMPTZ` | NO | |

- **Unique:** `(working_draft_id, row_number)`
- **Draft validation:** An implementation may optionally reject duplicate registration_id values within the same draft only if that is a chosen import-rule and is not treated as a database-wide identity uniqueness rule. No PostgreSQL uniqueness constraint is assumed for candidate identities at this level.
- **FK:** draft, optional candidate

---

### 4.7 Batch Versions (submitted snapshots)

#### Purpose

Content-immutable snapshot of a submission/resubmission used for review, approvals, AI analysis, and issuance.

#### Columns

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `batch_id` | `UUID` | NO | FK |
| `version_number` | `INT` | NO | Starts at 1; increments on each submit/resubmission |
| `status` | `batch_status` | NO | Workflow status for this version |
| `candidate_count` | `INT` | NO | Frozen at submit |
| `quality_review_threshold_applied` | `INT` | NO | Frozen copy of config (MVP default **50**) |
| `requires_quality_review` | `BOOLEAN` | NO | Frozen: `candidate_count >= quality_review_threshold_applied` |
| `district_approvals_required` | `INT` | NO | Frozen; MVP **2** |
| `quality_approvals_required` | `INT` | NO | Frozen; MVP **1** when quality required else **0** |
| `state_approvals_required` | `INT` | NO | Frozen; MVP **1** (extensible for dual-control) |
| `submitted_at` | `TIMESTAMPTZ` | NO | |
| `submitted_by_user_id` | `UUID` | NO | FK |
| `return_reason` | `TEXT` | YES | |
| `reject_reason` | `TEXT` | YES | |
| `notes` | `TEXT` | YES | Copied from draft at submit |
| `created_at` | `TIMESTAMPTZ` | NO | |
| `updated_at` | `TIMESTAMPTZ` | NO | |

#### Constraints and indexes

- **Unique:** `(batch_id, version_number)`
- **FK:** `batch_id`, `submitted_by_user_id`
- **Check:** `version_number >= 1`; `candidate_count >= 0`; all `*_approvals_required >= 0`; `quality_review_threshold_applied >= 1`
- **Indexes:** `(batch_id, version_number DESC)`; `(status, submitted_at)`; `(requires_quality_review, status)`

#### Quality review freeze

On submit/resubmission, read configurable `QUALITY_REVIEW_THRESHOLD` (default 50), store into `quality_review_threshold_applied`, compute and store `requires_quality_review`. Later config changes do not alter historical versions.

---

### 4.8 Candidates

#### Purpose

Person record for certification and delivery. Protected PII.

#### Columns

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `registration_id` | `VARCHAR(64)` | YES | Stable external registration identifier when available |
| `full_name` | `VARCHAR(200)` | NO | |
| `date_of_birth` | `DATE` | YES | |
| `gender` | `VARCHAR(32)` | YES | |
| `phone_e164` | `VARCHAR(32)` | YES | PII — delivery |
| `email` | `VARCHAR(320)` | YES | PII |
| `address_line` | `TEXT` | YES | PII |
| `created_at` | `TIMESTAMPTZ` | NO | |
| `updated_at` | `TIMESTAMPTZ` | NO | |

#### Identity rules (confirmed)

1. `registration_id` is nullable. It is not subject to a global or training-centre-specific uniqueness constraint in the initial design because the source-system owner has not confirmed the scope.
   - The initial database may store duplicate `registration_id` values while the source rule is unresolved.
   - Alternative future configuration A: add programme-wide uniqueness for non-null `candidates.registration_id` after confirming that identifiers are globally unique.
   - Alternative future configuration B: add training-centre-specific uniqueness after confirming the identifier is only unique within a centre and after adding/deriving the applicable centre scope.
   - Neither alternative is silently configured now.
2. **When `registration_id` is present:** exact `registration_id` may be used only for explicit same-ID lookup/linking when the source-system ownership is already known. Update mutable contact fields carefully under authorization; do **not** merge by name/phone similarity.
3. **When `registration_id` is unavailable:**
   - Create a **new** `candidates` row for that draft line (or reuse only an explicit `candidate_id` already on the draft row).
   - **Do not** search for “likely same person” via name, phone, or DOB.
   - Duplicate real-world persons may exist as separate rows; this is accepted over incorrect auto-merge.
4. **Never** automatically merge existing candidate rows using fuzzy matching.

#### Constraints and indexes

- **No initial uniqueness constraint** for `candidates.registration_id`; the column remains nullable.
- Any future programme-wide or centre-specific uniqueness rule must be approved and implemented deliberately through the applicable Prisma constraint or version-controlled custom migration SQL.
- **Indexes:** `(phone_e164)` authorized ops; `(full_name)` authorized search
- **Privacy:** exclude PII from public verification and minimize in audit/AI storage

---

### 4.9 Batch Candidates (per submitted version)

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `batch_version_id` | `UUID` | NO | FK |
| `candidate_id` | `UUID` | NO | FK |
| `row_number` | `INT` | NO | |
| `registration_id_snapshot` | `VARCHAR(64)` | YES | Value at submit time |
| `result_status` | `VARCHAR(32)` | NO | e.g. `PASSED` |
| `import_payload` | `JSONB` | YES | Sanitized |
| `is_eligible_for_certificate` | `BOOLEAN` | NO | default true |
| `created_at` | `TIMESTAMPTZ` | NO | |
| `updated_at` | `TIMESTAMPTZ` | NO | |

- **Unique:** `(batch_version_id, candidate_id)`; `(batch_version_id, row_number)`
- **FK:** version, candidate
- **Indexes:** `(candidate_id)`; `(batch_version_id, is_eligible_for_certificate)`
- **Content immutability:** after insert at submit, do not rewrite identity/membership fields

---

### 4.10 Approvals (immutable) and Approval Corrections

#### Purpose

Record human workflow decisions per submitted version. Rows are **never updated or deleted**.

#### `approvals`

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `batch_version_id` | `UUID` | NO | FK |
| `stage` | `approval_stage` | NO | `DISTRICT` \| `QUALITY` \| `STATE` |
| `decision` | `approval_decision` | NO | `APPROVED` \| `REJECTED` \| `RETURNED` |
| `officer_id` | `UUID` | NO | FK |
| `reason` | `TEXT` | YES | Required for REJECTED/RETURNED |
| `decided_at` | `TIMESTAMPTZ` | NO | |
| `created_at` | `TIMESTAMPTZ` | NO | |

- **Unique:** `(batch_version_id, stage, officer_id)` — same officer cannot decide twice on the same version/stage
- **Check:** reject/return require `reason`
- **Indexes:** `(batch_version_id, stage, decision)`; `(officer_id, decided_at DESC)`
- **Application policy:** INSERT only

#### Effective decision counting (MVP)

- Ignore superseded correction history after selecting the highest `correction_number` for each approval (see below).
- District: need `COUNT(DISTINCT officer_id)` of effective `APPROVED` ≥ `district_approvals_required` (2).
- Quality: if `requires_quality_review`, need effective quality approvals ≥ `quality_approvals_required`.
- State: need effective state approvals ≥ `state_approvals_required` (**1** for MVP).

#### `approval_corrections` (authorized override; preserves history)

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `approval_id` | `UUID` | NO | FK → original immutable approval |
| `correction_number` | `INT` | NO | Sequential correction number for this approval, starting at 1 |
| `corrected_decision` | `approval_decision` | NO | Replacement effective decision |
| `reason` | `TEXT` | NO | Mandatory justification |
| `corrected_by_user_id` | `UUID` | NO | FK; authorized role only |
| `created_at` | `TIMESTAMPTZ` | NO | |

- **Unique:** `(approval_id, correction_number)`
- **Effective correction:** the row with the highest `correction_number` for an approval is the effective correction; lower-numbered rows remain immutable history.
- Corrections are serialized by locking the associated `batch_versions` row before allocating the next correction number and inserting the correction.
- Original `approvals` rows remain unchanged forever.
- Every correction also writes `audit_logs`; corrections must not reassign an approval to a different `batch_version_id`.

---

### 4.11 Certificates

#### Purpose

Issued credential metadata and **validity** status. PDF in private storage; DB holds keys/status.

#### Columns

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `batch_candidate_id` | `UUID` | NO | FK; **only** structural link to batch/version/candidate |
| `certificate_number` | `VARCHAR(64)` | NO | `CF-YYYY-{UNIQUE_IDENTIFIER}` |
| `issuance_year` | `INT` | NO | YYYY used in number; for indexing/reporting |
| `certificate_status` | `certificate_status` | NO | Validity; starts as `PENDING_GENERATION` |
| `delivery_status` | `delivery_status` | NO | Operational WhatsApp state; independent of validity |
| `issued_at` | `TIMESTAMPTZ` | YES | Set only when PDF generation succeeds, the PDF is persisted privately, and status becomes `ISSUED` |
| `cancelled_at` | `TIMESTAMPTZ` | YES | |
| `cancelled_by_user_id` | `UUID` | YES | FK |
| `cancellation_reason` | `TEXT` | YES | |
| `file_storage_key` | `VARCHAR(512)` | YES | Private key, not public URL |
| `verification_code` | `VARCHAR(64)` | YES | Optional secondary public token |
| `created_at` | `TIMESTAMPTZ` | NO | |
| `updated_at` | `TIMESTAMPTZ` | NO | |

**Enum `certificate_status`:** `PENDING_GENERATION` | `ISSUED` | `CANCELLED`  

**Enum `delivery_status`:** `NOT_STARTED` | `PENDING` | `DELIVERED` | `FAILED`

#### Certificate lifecycle

- A newly created certificate record must always use `PENDING_GENERATION` and must not set `issued_at`.
- The PDF worker may set the record to `ISSUED` only after PDF generation succeeds and the PDF is persisted in the private storage system.
- The transition to `ISSUED` and assignment of `issued_at` occur together after persistence succeeds.
- Failed PDF generation leaves the certificate at `PENDING_GENERATION` or in a documented retryable processing state; it must never create an `ISSUED` certificate.
- Cancellation may set `CANCELLED` independently of `PENDING_GENERATION` or `ISSUED`; public verification rejects both `PENDING_GENERATION` and `CANCELLED` certificates.
- `delivery_status` changes do not alter certificate validity or issued status.

#### Constraints and indexes

- **Unique:** `certificate_number`; `batch_candidate_id`; `verification_code` WHERE NOT NULL
- **FK:** `batch_candidate_id → batch_candidates.id`; `cancelled_by_user_id → users.id`
- **Check:** if `certificate_status = CANCELLED` then `cancelled_at IS NOT NULL`; if `ISSUED` then `issued_at IS NOT NULL` and `file_storage_key IS NOT NULL`
- **Indexes:** `(certificate_status)`; `(delivery_status)`; `(issuance_year)`

#### Public verification

- Public verification accepts only a certificate with `certificate_status = ISSUED`.
- `PENDING_GENERATION` ⇒ invalid/not yet issued.
- `CANCELLED` ⇒ invalid immediately.
- `delivery_status` must not affect authenticity.

---

### 4.12 Delivery Attempts

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `certificate_id` | `UUID` | NO | FK |
| `attempt_number` | `INT` | NO | Per certificate |
| `channel` | `VARCHAR(32)` | NO | default `WHATSAPP` |
| `provider` | `VARCHAR(64)` | NO | e.g. `SIMULATED_WHATSAPP` |
| `provider_message_id` | `VARCHAR(128)` | YES | |
| `idempotency_key` | `VARCHAR(128)` | NO | Unique |
| `status` | `delivery_attempt_status` | NO | `QUEUED` \| `SENT` \| `FAILED` \| `TIMEOUT` \| `RETRY_SCHEDULED` |
| `error_code` | `VARCHAR(64)` | YES | |
| `error_message` | `TEXT` | YES | |
| `request_payload_hash` | `VARCHAR(128)` | YES | Avoid storing full PII payloads |
| `attempted_at` | `TIMESTAMPTZ` | NO | |
| `completed_at` | `TIMESTAMPTZ` | YES | |
| `created_at` | `TIMESTAMPTZ` | NO | |

- **Unique:** `(certificate_id, attempt_number)`; `idempotency_key`
- **FK:** `certificate_id`
- **Indexes:** `(certificate_id, attempted_at DESC)`; `(status, attempted_at)`
- Delivery failures update `certificates.delivery_status` only — **never** create another certificate; **never** flip `certificate_status` to cancelled implicitly

---

### 4.13 Audit Logs

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `actor_user_id` | `UUID` | YES | Null for system jobs |
| `action` | `VARCHAR(100)` | NO | |
| `entity_type` | `VARCHAR(64)` | NO | |
| `entity_id` | `UUID` | NO | |
| `batch_id` | `UUID` | YES | Convenience |
| `batch_version_id` | `UUID` | YES | Convenience |
| `ip_address` | `INET` | YES | |
| `user_agent` | `TEXT` | YES | |
| `metadata` | `JSONB` | YES | Minimize PII |
| `created_at` | `TIMESTAMPTZ` | NO | |

- **FK:** `actor_user_id` nullable
- **Indexes:** `(entity_type, entity_id, created_at DESC)`; `(batch_id, created_at DESC)`; `(actor_user_id, created_at DESC)`; `(action, created_at DESC)`
- INSERT only

**Minimum audited actions:** batch create/submit/return/reject/resubmit; approvals; approval corrections; certificate issue/cancel; notable delivery outcomes; AI analysis requested (optional).

---

### 4.14 AI Analysis / Findings / Feedback

AI remains **advisory** and isolated: no FKs into `approvals`; approval services must not treat findings as authority.

#### `ai_analyses`

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `batch_version_id` | `UUID` | NO | FK |
| `requested_by_user_id` | `UUID` | YES | FK |
| `provider` | `VARCHAR(64)` | NO | |
| `model_name` | `VARCHAR(128)` | NO | |
| `status` | `ai_analysis_status` | NO | `PENDING` \| `COMPLETED` \| `FAILED` |
| `summary` | `TEXT` | YES | |
| `raw_response_ref` | `VARCHAR(512)` | YES | |
| `prompt_version` | `VARCHAR(64)` | YES | |
| `started_at` / `completed_at` / `created_at` | `TIMESTAMPTZ` | mixed | |

#### `ai_findings`

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `ai_analysis_id` | `UUID` | NO | FK |
| `severity` | `ai_finding_severity` | NO | labels only |
| `category` | `VARCHAR(64)` | NO | |
| `title` | `VARCHAR(255)` | NO | |
| `detail` | `TEXT` | NO | Minimize PII |
| `related_batch_candidate_id` | `UUID` | YES | FK |
| `created_at` | `TIMESTAMPTZ` | NO | |

#### `ai_finding_feedback`

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `ai_finding_id` | `UUID` | NO | FK |
| `user_id` | `UUID` | NO | FK |
| `rating` | `ai_feedback_rating` | NO | |
| `comment` | `TEXT` | YES | |
| `created_at` | `TIMESTAMPTZ` | NO | |

- **Unique:** `(ai_finding_id, user_id)`

---

### 4.15 AI Chat History (PostgreSQL)

#### `ai_chat_sessions`

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `user_id` | `UUID` | NO | FK |
| `batch_id` | `UUID` | YES | Context only |
| `batch_version_id` | `UUID` | YES | Context only |
| `title` | `VARCHAR(255)` | YES | |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | NO | |

#### `ai_chat_messages`

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `session_id` | `UUID` | NO | FK |
| `role` | `ai_chat_role` | NO | `USER` \| `ASSISTANT` \| `SYSTEM` |
| `content` | `TEXT` | NO | Scrub/minimize PII before persist |
| `token_count` | `INT` | YES | |
| `created_at` | `TIMESTAMPTZ` | NO | |

- **Indexes:** `(session_id, created_at)`
- Chat must not write approvals or change batch/certificate validity status

---

### 4.16 OutboxEvent (initial migration — required)

Durable outbox for async certificate generation, WhatsApp delivery, and notifications.

| Column | Type | Null | Notes |
| ------ | ---- | ---- | ----- |
| `id` | `UUID` | NO | PK |
| `event_type` | `VARCHAR(100)` | NO | |
| `aggregate_type` | `VARCHAR(64)` | NO | |
| `aggregate_id` | `UUID` | NO | |
| `payload` | `JSONB` | NO | Ids only; minimize PII |
| `idempotency_key` | `VARCHAR(128)` | NO | Unique |
| `status` | `outbox_status` | NO | `PENDING` \| `PROCESSING` \| `PUBLISHED` \| `FAILED` |
| `attempt_count` | `INT` | NO | default 0 |
| `available_at` | `TIMESTAMPTZ` | NO | When eligible for pickup (backoff) |
| `locked_at` | `TIMESTAMPTZ` | YES | Worker lease |
| `processed_at` | `TIMESTAMPTZ` | YES | Set only after the consumer successfully processes the event |
| `last_error` | `TEXT` | YES | |
| `created_at` | `TIMESTAMPTZ` | NO | |
| `published_at` | `TIMESTAMPTZ` | YES | Set only after successful publication to the queue |

#### Outbox lifecycle

- `PENDING` means eligible publication is pending and may remain so if Redis or the publisher is unavailable.
- `PUBLISHED` or `published_at` means the outbox publisher successfully published the event to the queue. It does not mean the consumer completed processing.
- `processed_at` means a consumer successfully processed the event. `processed_at` is independent of `published_at` and may be set later.
- `published_at` and `processed_at` must never be aliases or substituted for one another.
- Republished or retried queue delivery remains safe only when consumers are idempotent and use `idempotency_key`.

---

## 5. Complete constraints and indexes (quick reference)

| Entity | Uniques | Notable checks / FKs | Indexes |
| ------ | ------- | -------------------- | ------- |
| User | `email` | role↔FK checks; FK district/centre | role+active; district; centre |
| District | `code` | | active; name |
| TrainingCentre | `code` | FK district | district; active |
| Course | `code` | | active |
| Batch | `batch_number` | FKs; version≥0 | centre+status; district+status; status+updated |
| BatchWorkingDraft | `batch_id` | FK batch | |
| BatchDraftCandidate | `(draft, row_number)`; optional draft-time import duplicate rule only | FK draft; optional candidate; no candidate-global identity uniqueness | |
| BatchVersion | `(batch_id, version_number)` | frozen threshold/requirements checks | batch+version; status; quality flag |
| Candidate | — (no initial registration_id uniqueness) | Nullable registration_id; future programme-wide or centre-specific rule requires explicit approval | phone; name |
| BatchCandidate | `(version, candidate)`; `(version, row_number)` | FK version/candidate | candidate; eligible |
| Approval | `(version, stage, officer)` | reason if reject/return; INSERT only | version+stage+decision |
| ApprovalCorrection | `(approval_id, correction_number)` | Highest correction_number is effective; FK approval/user; reason NOT NULL; immutable history | approval_id; correction_number |
| Certificate | `certificate_number`; `batch_candidate_id`; partial verification_code | format check; status↔timestamps; FK batch_candidate only (+ canceller) | cert status; delivery status; year |
| DeliveryAttempt | `(certificate, attempt_number)`; `idempotency_key` | FK certificate | certificate+time; status |
| AuditLog | — | FK actor optional | entity; batch; actor; action |
| AiAnalysis | — | FK version | version+time; status |
| AiFinding | — | FK analysis | analysis; severity |
| AiFindingFeedback | `(finding, user)` | | finding; rating |
| AiChatSession | — | FK user | user |
| AiChatMessage | — | FK session | session+time |
| OutboxEvent | `idempotency_key` | attempt_count≥0 | status+available_at; aggregate; locked_at |

---

## 6. Critical flows

### 6.1 Submit / resubmit (draft → new BatchVersion)

1. Lock `batches` (`FOR UPDATE` / `row_version` check).
2. Validate working draft (all-or-nothing).
3. Resolve candidates per registration-id rules (no fuzzy merge). For returned-batch resubmission, retain the existing `candidate_id` copied into each draft line; do not recreate the candidate unnecessarily.
4. Insert `batch_versions` (`version_number = current+1`) with frozen quality threshold (default 50 from config), `requires_quality_review`, and stage requirement counts (district 2, quality 0/1, state 1).
5. Insert new immutable `batch_candidates` snapshot records referencing the preserved candidate IDs. Do not reuse or mutate previous `BatchCandidate` records.
6. Update batch `current_version_*` + `current_status`; bump `row_version`.
7. Audit (+ optional outbox notify).
8. Prior version content and approvals untouched.

### 6.2 Approval decision

1. Lock current `batch_versions` row.
2. Authorize role + district scope.
3. Insert immutable `approvals` row (unique protects double decide).
4. Recompute effective approvals (including corrections).
5. Conditionally advance status using frozen `*_approvals_required` and `requires_quality_review`.
6. Sync `batches.current_status`; audit.

### 6.3 Approval correction / override

1. Authorize elevated role.
2. Lock the associated `batch_versions` row in the same transaction.
3. Read the highest existing `correction_number` for the original approval, allocate `highest + 1`, and insert the immutable `approval_corrections` row.
4. The highest `correction_number` becomes effective; do not update or delete original approval or prior correction rows.
5. Re-evaluate workflow eligibility from effective decisions.
6. Audit the correction and apply any explicit status transition in the same transaction.

### 6.4 Certificate issuance (duplicate-safe)

In one transaction after state requirements met:

1. Lock version; verify status + effective approvals for **this** version.
2. Insert certificates for eligible batch_candidates with `certificate_number = CF-{year}-{unique}`, `certificate_status=PENDING_GENERATION`, `issued_at=NULL`, `delivery_status=NOT_STARTED`, and no status-transition shortcut.
3. Insert `outbox_events` (generate PDF / deliver) with unique idempotency keys; set `available_at=now()`.
4. Set version/batch to `ISSUING` per workflow definition; audit.
5. After PDF generation succeeds and the PDF is persisted in private storage, update the certificate to `ISSUED` and set `issued_at` together.
6. Failed PDF generation leaves the certificate non-issued and must not set `ISSUED` or `issued_at`; `delivery_status` remains independent.

Uniqueness on `batch_candidate_id` and `certificate_number` makes retries safe.

### 6.5 Delivery failure

1. Insert `delivery_attempts`; update `delivery_status` only.
2. Never insert another certificate; never auto-cancel.

### 6.6 Cancellation / public verify

1. Set `certificate_status=CANCELLED` (+ audit). Independent of `delivery_status`.
2. Public verify reads live `certificate_status`.

---

## 7. Transaction and concurrency strategy

| Operation | Same DB transaction includes | Concurrency control |
| --------- | ---------------------------- | ------------------- |
| Draft edits | Draft tables only | Batch ownership checks; optional draft row locks |
| Submit / resubmit | Lock batch; new version; candidates; batch pointers; audit; optional outbox | `FOR UPDATE` batch; unique `(batch_id, version_number)`; `row_version` |
| Approval decide | Lock version; insert approval; status updates; audit | `FOR UPDATE` version; unique `(version, stage, officer)` |
| Approval correct | Lock associated version; allocate next correction_number; insert correction; possible status recompute; audit | `FOR UPDATE` on associated batch_versions row; unique `(approval_id, correction_number)` |
| Issue certificates | Lock version; insert PENDING_GENERATION certificates; insert outbox rows; status; audit | Uniques on cert + outbox idempotency keys; PDF success required before ISSUED |
| Outbox create | With the business write that needs async follow-up | Unique `idempotency_key` |
| Outbox claim/process | Update `locked_at`, `attempt_count`, `status`, `last_error`; set `processed_at` only after successful consumer processing | Conditional update where `locked_at` null/stale and `available_at <= now()` |
| Delivery attempt | Attempt insert + certificate `delivery_status` | Unique attempt idempotency key |
| Cancel certificate | Status fields + audit (+ outbox/SSE) | Row update on certificate id |

Keep AI persistence **out of** approval/issue transactions.

---

## 8. Idempotency requirements

| Surface | Mechanism |
| ------- | --------- |
| Officer decision | Unique `(batch_version_id, stage, officer_id)` |
| Certificate create | Unique `batch_candidate_id` + unique `certificate_number` |
| Outbox | Unique `idempotency_key`; safe republish; consumers idempotent |
| WhatsApp send | Unique `delivery_attempts.idempotency_key` |
| AI feedback | Unique `(ai_finding_id, user_id)` |

---

## 9. Business rules → schema checklist

| # | Rule | Design response |
| - | ---- | --------------- |
| 1 | ≥2 distinct district officers | Count effective district approvals vs frozen `district_approvals_required` |
| 2 | Same officer cannot decide twice | Unique `(batch_version_id, stage, officer_id)` |
| 3 | Resubmission → new version | New `BatchVersion` from working draft |
| 4 | Old approvals historical only | Version FK; counts use current version only |
| 5 | ≤1 cert per candidate per version | `BatchCandidate` per version + unique `certificates.batch_candidate_id` |
| 6 | Globally unique certificate numbers | Unique + `CF-YYYY-…` check |
| 7 | Cancelled invalid immediately | `certificate_status=CANCELLED`; PENDING_GENERATION and CANCELLED both fail public verification; verify ignores delivery |
| — | PDF success before issuance | New certificates start PENDING_GENERATION; set ISSUED and issued_at only after private PDF persistence succeeds |
| — | Immutable approvals | Corrections table; originals untouched; highest correction_number effective |
````markdown
## 10. Initial migration entity set (when implementation is approved)

Include at least:

`districts`, `training_centres`, `courses`, `users`, `batches`, `batch_working_drafts`, `batch_draft_candidates`, `batch_versions`, `candidates`, `batch_candidates`, `approvals`, `approval_corrections`, `certificates`, `delivery_attempts`, `audit_logs`, `outbox_events`, `ai_analyses`, `ai_findings`, `ai_finding_feedback`, `ai_chat_sessions`, `ai_chat_messages`

---

## 11. Prisma mapping notes (later — do not implement now)

- Mirror enums and `@@unique` / `@unique` exactly as listed.
- Certificate relation: only `batchCandidate`; use nested reads for batch/version/candidate.
- Treat `approvals` and `audit_logs` as create-only in repositories.
- Map `OutboxEvent` including claim fields in the first migration.
- Do not add an initial Prisma unique constraint for `candidates.registration_id`.
- If later approved, implement registration-ID uniqueness only through the confirmed programme-wide or training-centre-specific design; document the scope in the migration and any related model constraints.
- For PostgreSQL-specific constructs not represented in Prisma schema, keep custom SQL in version-controlled Prisma migration files; do not rely on undocumented manual database changes.

---

## 12. Review gate

**Confirmed product decisions are incorporated in this document.**  

**Do not create Prisma models, migrations, SQL, or tables until explicit human approval to implement.**

No database objects have been created or altered by this documentation update.
