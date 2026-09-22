# JAXIS Scope

**Project:** JAXIS\
**Document:** Business & Product Scope\
**Status:** Discovery and business clarification completed\
**Scope Type:** Business/Product Scope --- technical implementation is
intentionally excluded.

## 1. Executive Summary

JAXIS is a managed research-data analysis and statistical support
service for individual students/researchers, faculty/researchers, and
universities/institutions. The platform manages the lifecycle from
intake and research assessment through package/pricing approval, SOW
signing, payment, Expert assignment, statistical work, QA, delivery,
revisions, disputes, and Expert payout.

The MVP active offerings are JX-01 DataCheck, JX-02 Start, JX-03 Core,
JX-04 Advanced, DefenseLab, Rush, Express, and Emergency. Premium and
Validate are future/out-of-MVP.

## 2. Business Model

The client submits research requirements and supporting materials. Admin
evaluates the research, determines the appropriate package and price,
and communicates the proposal to the client. The client approves the
commercial proposal, signs the SOW, and follows the agreed payment
arrangement. JAXIS then assigns a verified Expert. The Expert performs
only the agreed scope. Work passes through the applicable QA process
before delivery. The client receives the final deliverable and may
request the included revision within the defined window. Expert payout
is released according to the package payout rules after QA approval and
delivery.

## 3. Users and Permissions

### Client

-   Create an account and submit projects.
-   Submit required research information and files.
-   Update/replace documents before SOW finalization.
-   Review and approve package/pricing proposals.
-   Sign SOWs.
-   Make payments.
-   Communicate through JAXIS.
-   Download final deliverables.
-   Request included revisions.
-   Submit dispute evidence.
-   Request permitted data deletion.
-   Purchase DefenseLab and turnaround upgrades.

Only the account creator who signed the SOW is the authorized project
communicator when multiple people are associated with a project.

### Statistician

-   Maintain defined statistical specializations.
-   Receive assigned projects.
-   Access assigned project scope and required files.
-   Perform agreed analysis.
-   Upload outputs.
-   Respond to QA correction requirements.
-   Communicate with clients through JAXIS.
-   Track applicable payouts.

Experts may not bypass JAXIS for direct client payment or side
contracts.

### Senior Statiscian (QA Statiscian)

-   Review work in the QA queue.
-   Approve/reject deliverables.
-   Provide QA comments and correction requirements.
-   Record error findings.
-   Recommend action for repeated Expert failures.

### Manager/ Operations

-   Review intake.
-   Request missing information.
-   Evaluate research.
-   Propose package and price.
-   Communicate package/price changes and obtain client approval.
-   Generate/manage SOWs.
-   Assign and reassign Experts.
-   Monitor deadlines.
-   Manage operational workflow, blocked messages, revisions, disputes,
    and Expert suspension.

### Admin / Owner

-   Final refund authority.
-   Final chargeback/dispute authority.
-   Permanent Expert termination authority.
-   High-level governance and configuration authority.

## 4. Client Intake

A client must create an account before submitting a project. General
inquiries may be submitted without an account but are limited to general
inquiry.

Required intake information includes: - Client name - Contact
information - Research title - Research questions - Research
objectives - Chapters 1--3 - Research instrument/questionnaire -
Requested deadline

The raw dataset is required **only when applicable to the analysis**.

Incomplete submissions require Admin to request missing information; the
client cannot proceed until required information is complete.

Clients may update or replace documents before the SOW is finalized.

## 5. Packages and Pricing

  ----------------------------------------------------------------------------
  Package                                      Price Included Work
  --------------------- ---------------------------- -------------------------
  JX-01 DataCheck                       ₱1,000 fixed Automated data
                                                     cleaning/scrubber;
                                                     normality and outlier
                                                     identification;
                                                     Cronbach's Alpha; JAXIS
                                                     Readiness Report

  JX-02 Start                         ₱1,500--₱1,800 Descriptive
                                                     statistics/frequencies;
                                                     cross-tabulations; APA
                                                     7th tables; plain-English
                                                     narrative

  JX-03 Core                          ₱1,800--₱3,000 Standard inferential
                                                     tests including T-Tests,
                                                     ANOVA, Regression;
                                                     assumption checks/effect
                                                     sizes; 4-Part Narrative
                                                     Report; Tier 2 Human QA

  JX-04 Advanced                             ₱3,000+ Advanced modeling
                                                     including SEM, Factor
                                                     Analysis, Time-Series;
                                                     custom methodological
                                                     consultation; priority
                                                     Tier 2 QA
  ----------------------------------------------------------------------------

### Add-ons

  Add-on                  Price          Turnaround
  ----------------- ----------- -------------------
  DefenseLab          ₱250/hour   Scheduled session
  JAXIS Rush               ₱300              3 days
  JAXIS Express            ₱600            48 hours
  JAXIS Emergency        ₱1,000            24 hours

For package ranges, final pricing considers the requested analysis,
complexity, Expert effort, deadline, and Admin assessment. Admin
proposes the final price and the client approves it. Admin may manually
adjust pricing within the approved price range.

Admin may recommend a different package after research review, but must
communicate the change and obtain client approval.

Multiple packages may be purchased for one project. Add-ons cannot be
purchased after project execution has started.

Premium and Validate are future/out-of-MVP.

## 6. Turnaround and SLA

Standard turnaround is **3--5 days**.

The SLA timer begins **after Expert assignment**.

Turnaround includes weekends but excludes holidays.

If JAXIS is waiting for client information or clarification, the
turnaround timer pauses. The statistician must notify Admin when
requesting the pause.

If JAXIS misses a promised Rush/Express/Emergency deadline, **only the
turnaround upgrade fee is refunded**.

A 24-hour pre-deadline status check must be implemented/managed by Admin
to protect against project ghosting.

## 7. SOW / Contract

The client approves the SOW using a typed name/signature.

The SOW includes the applicable client information, research title,
package, scope of work, deliverables, price, turnaround time, and
liability/boundary terms.

After signing: - The SOW cannot be edited. - Required changes require a
new SOW. - The signed scope is treated as locked.

## 8. Payment

Confirmed payment methods: - GCash - Bank transfer

The specific payment provider is a CTO/product implementation decision.

Full payment before work begins is not mandatory. Partial/installment
payments are allowed.

Failed payment behavior: - Client may retry. - Payment link remains
available. - Project remains Pending. - Pending unpaid project expires
after **3 days**.

## 9. Refunds and Chargebacks

Refunds apply when: - JAXIS deviated from the agreed methodology; or -
JAXIS committed a verifiable mathematical error.

Subjective academic disagreement does not qualify.

Final refund authority is **Operations Manager**. Partial refunds are not
allowed under the confirmed policy.

If a JAXIS/system error results in a refund, the Expert still receives
the approved payout; the system/JAXIS side bears that risk.

### Chargebacks

-   Project status becomes **Halted**.
-   The dispute is handled through the bank/payment dispute process and
    SOW.
-   Expert payout remains **Pending**.
-   Operations Manager has final authority.

## 10. Expert Assignment

The system may recommend an Expert, but **Admin approves the
assignment**.

Expert selection considers specialization and workload/capacity.

Experts have defined areas of specialization such as Regression, ANOVA,
SEM, Factor Analysis, Instrument Validation, and Time Series.

Experts cannot decline an assigned project under the confirmed workflow
because Experts submit interest/request before selection.

Admin may reassign a project after work has started in extreme cases.
The original Expert's payout is voided upon reassignment.

## 11. QA

### Tier 1 --- Automated QA

-   DataCheck
-   Start

### Tier 2 --- Senior Human QA

-   Core
-   Advanced
-   DefenseLab

QA rejection provides the Expert with comments and correction
requirements. The internal QA revision clock is **24 hours**.

Repeated rejection results in escalation/reassignment according to QA
operations.

Repeated Expert failures are handled **case-by-case by Admin, based on
QA recommendation and Admin approval**.

QA is an internal workflow. Clients do **not** receive QA
approval/rejection notifications because the client determined that
exposing those internal QA states could create doubt.

## 12. Revisions and Scope Changes

Each project includes **1 revision**.

The revision window is **3 business days** after delivery.

Examples of scope-aligned revisions: - Variable-name corrections -
Findings/reporting style adjustments

Examples of paid/out-of-scope changes: - Additional statistical tests -
Fundamental methodology changes - Scope expansion

Admin decides whether a request is an included revision, methodology
change, or new paid work. Out-of-scope work requires a supplementary
SOW/contract.

## 13. DefenseLab

DefenseLab is a ₱250/hour 1-on-1 mock panel defense with a JAXIS senior
statistician.

Payment is required before scheduling. Multiple hours may be purchased.
Expert and client coordinate through JAXIS.

Rescheduling requires **12 hours notice**.

If the client reschedules too late or does not attend, the session
proceeds as planned despite the no-show.

If the Expert needs to reschedule, the same 12-hour notice applies.
Otherwise, the session may be reassigned and the Expert receives a
**case-by-case Admin-determined penalty**.

DefenseLab sessions are recorded and the client receives the recording.

## 14. Communication Firewall

Client/Expert communication must occur entirely inside JAXIS.

Restricted information includes: - Personal email - Phone numbers -
WhatsApp - Telegram - Facebook/Messenger - Personal social media -
GCash/payment information - Bank details - External payment links

When prohibited information is detected, the entire message is blocked.
Admin can view blocked messages and intervene.

## 15. Files and Data

Confirmed client upload formats include: - DOCX - PDF - XLSX - CSV

Clients may replace documents during the applicable pre-finalization
workflow.

Completed project files are retained for **90 days**.

Clients may request deletion of project data, subject to records JAXIS
must retain for legal, financial, dispute, or audit purposes.

## 16. Notifications

Primary notification channel: **Email**.

Client-facing notifications cover applicable operational events such
as: - SOW ready - SOW signed - Payment successful - Payment failed -
Project activated - Expert assigned - New message - Additional
information required - Project delivered - Refund processed

QA approval/rejection notifications are not sent to clients.

## 17. Reporting

Required reporting includes: - Total revenue - Expert payouts - Company
margin - Active projects - Completed projects - Projects by package -
Average turnaround time - Missed deadlines - Expert performance -
Client/project volume - Refunds - Chargebacks - Rush/Express/Emergency
sales

Report export format: **PDF**.

## 18. Expert Payouts

  Package                        Expert Payout
  ------------ -------------------------------
  DataCheck                            40--50%
  Start                                40--50%
  Core                                 60--65%
  Advanced                             70--75%
  Premium        70--75% --- future/out of MVP
  DefenseLab                               80%

The actual rate within a range follows the approved rate for the year.

Payout is released after QA approval and client delivery.

Rules: - Client cancels before work: payout voided. - Expert reassigned:
original payout voided. - Expert work rejected by QA: no payout for
rejected work. - JAXIS/system error: approved Expert payout remains
protected. - Chargeback: payout remains pending until dispute
resolution.

## 19. Expert Suspension and Termination

Admin can temporarily suspend an Expert.

Operations Manager can permanently terminate an Expert.

Serious violations include bypassing JAXIS for direct payment,
falsifying data, p-hacking, ghostwriting, and other serious policy
violations.

When an Expert is suspended/terminated: - Active projects are
reassigned. - Pending payouts are handled according to the applicable
disciplinary policy. - Serious violations may result in forfeiture of
pending payouts.

## 20. Disputes

-   Final authority: Operations Manager.
-   Client may submit supporting evidence.
-   Dispute deadline: 7 days after delivery.
-   Expert payout remains protected when the dispute is caused by a
    client/adviser methodology change rather than a JAXIS error.

## 21. Offline and External Integrations

### Offline

No offline functionality is included in MVP.

### External integrations

GCash and bank transfer are required payment methods. The exact payment
provider is a CTO/product decision. No other external integration is
confirmed as mandatory for MVP.

## 22. Project Lifecycle

Primary lifecycle:

**Inquiry → Intake → Awaiting Information → Admin Evaluation → Client
Approval → SOW Ready → SOW Signed → Pending Payment → Active → Expert
Assigned → In Progress → QA → QA Revision (if required) → Delivered →
Revision Window → Closed**

Exception states include: - Halted - Cancelled - Reassigned - Disputed -
Refunded - Expired

Status transitions must follow the relevant business rules and role
permissions.

## 23. Core Business Rules

1.  Raw dataset is required only when applicable to the requested
    analysis.
2.  Incomplete intake blocks progression until required information is
    supplied.
3.  Package/price changes require client approval.
4.  Signed SOW scope is locked.
5.  Client-caused information delays pause the SLA timer.
6.  QA approval is required before final delivery.
7.  One client revision is included within 3 business days.
8.  Out-of-scope work requires additional commercial approval and a
    supplementary SOW.
9.  Client/Expert side-channel communication is prohibited.
10. Unpaid Pending projects expire after 3 days.
11. JAXIS SLA failure refunds only the turnaround upgrade fee.
12. JAXIS/system errors do not reduce the Expert's approved payout.
13. Chargebacks halt the project and keep payout pending.
14. Operations Manager has final authority for refunds and
    chargebacks/disputes.
15. DefenseLab requires 12-hour rescheduling notice.
16. Late client DefenseLab reschedule/no-show proceeds as planned.
17. Late Expert DefenseLab reschedule may result in reassignment and an
    Admin-determined penalty.
18. Repeated QA failures are handled case-by-case based on QA
    recommendation and Admin approval.
19. Completed project files are retained for 90 days.
20. Premium and Validate are future/out-of-MVP.

## 24. Edge Cases

### Incomplete intake

Admin requests missing material; project cannot proceed until complete.

### Package mismatch

Admin may recommend a different package; client must approve the change.

### Scope expansion

Additional tests or fundamental methodology changes require additional
commercial approval.

### QA rejection

Expert receives correction requirements and must address them through
the internal QA workflow.

### Repeated QA failure

QA recommends action; Admin makes the case-by-case decision.

### Client-caused delay

SLA timer pauses.

### JAXIS-caused SLA failure

Only the applicable turnaround-upgrade fee is refunded.

### JAXIS/system error

Expert's approved payout remains protected.

### Chargeback

Project is halted; payout remains pending; Operations Manager decides the final
outcome.

### Expert reassignment

Original Expert payout is voided.

### DefenseLab client no-show

Session proceeds as scheduled.

### DefenseLab Expert late reschedule

Session may be reassigned and the Expert is subject to an
Admin-determined penalty.

## 25. MVP Scope

### Included

-   Client accounts and general inquiry
-   Project intake
-   Research document upload
-   Package and pricing workflow
-   Admin evaluation
-   Client approval
-   SOW generation/signing
-   Payment and installment workflow
-   Project lifecycle management
-   Expert assignment and capacity tracking
-   Project workspace
-   Client/Expert messaging with communication firewall
-   Tiered QA
-   QA revision workflow
-   Client delivery
-   One included revision
-   DefenseLab
-   Rush/Express/Emergency
-   Refunds
-   Chargebacks
-   Expert payouts
-   Disputes
-   Expert suspension/termination
-   Email notifications
-   Operational/financial reporting
-   90-day project-file retention

### Future / Out of MVP

-   Premium
-   Validate
-   Offline functionality
-   Unconfirmed external integrations
-   Additional packages not included in the current commercial offering

## 26. Scope Boundaries

JAXIS is a managed research/statistical analysis service platform. It is
not defined as: - A general-purpose statistical software replacement. -
A ghostwriting service. - An unrestricted academic writing service. - A
direct client-to-Expert marketplace. - An offline-first application. -
An unrestricted file-storage platform. - A mechanism for clients and
Experts to transact outside JAXIS.

The platform's business responsibility is to control intake, scope,
pricing, SOWs, payment, Expert assignment, QA, communication, delivery,
revisions, disputes, and Expert payout.

## 27. CTO / Technical Planning Boundary

The following are intentionally outside this business scope and should
be decided during technical planning: - Exact payment provider - Maximum
file upload size - Cloud/infrastructure architecture - Database
architecture - API design - Security implementation - Encryption
implementation - External integration architecture - Notification
infrastructure - Offline implementation details - Hosting/deployment -
Monitoring and observability

## 28. Scope Completion Status

The business discovery and clarification phase is considered complete.
The current document represents the confirmed JAXIS business model,
workflows, roles, permissions, commercial rules, QA rules, payment
rules, payout rules, dispute rules, retention policy, notification
behavior, and MVP boundary.

Technical architecture and implementation planning should begin only
after this scope is reviewed and approved.
