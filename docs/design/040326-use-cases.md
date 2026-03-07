# Use Cases — Recruiting Management Platform

**Date:** 04/03/2026
**Status:** Approved
**Related:** [Domain Analysis](./040326-domain-analysis.md)

---

## 1. Actors

| Actor                | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| **RecruitingOfficer**| Authenticated user with role `RECRUITING_OFFICER`. Manages job descriptions, reviews applications, and can create other officers. |
| **Guest/Applicant**  | Unauthenticated user who accesses a direct link to a published JobDescription to submit an application. |

> **Note:** There is no ADMIN role at this stage. The first RecruitingOfficer is seeded via the database setup (Docker Compose). Any existing RecruitingOfficer can create new ones.

---

## 2. Use Cases

### 2.1 IAM (Identity & Access Management) Context 

#### UC-01: Login

- **Actor:** RecruitingOfficer
- **Preconditions:** User account exists and is active
- **Flow:**
  1. Officer provides email and password
  2. System validates credentials
  3. System returns authentication token
- **Postconditions:** Officer has a valid session/token

#### UC-02: Create RecruitingOfficer

- **Actor:** RecruitingOfficer (authenticated)
- **Preconditions:** Actor is authenticated with role `RECRUITING_OFFICER`
- **Flow:**
  1. Actor provides new officer's data (name, email, password)
  2. System validates email uniqueness
  3. System creates User with role `RECRUITING_OFFICER`
- **Postconditions:** New RecruitingOfficer account exists and is active
- **Business rule:** Any existing RecruitingOfficer can create new ones

> **Evolution note:** When an ADMIN role is introduced, the authorization on this use case changes from "any RecruitingOfficer" to "only ADMIN". The use case itself remains the same.

---

### 2.2 Company Management

#### UC-03: Create Company

- **Actor:** RecruitingOfficer
- **Preconditions:** Actor is authenticated
- **Flow:**
  1. Actor provides company data (name, country, fields)
  2. System validates name is non-empty and country is valid
  3. System creates Company
- **Postconditions:** Company exists and can be referenced by JobDescriptions

#### UC-04: List Companies

- **Actor:** RecruitingOfficer
- **Preconditions:** Actor is authenticated
- **Flow:**
  1. Actor requests list of companies
  2. System returns all companies
- **Postconditions:** None (read-only)

---

### 2.3 Job Description Lifecycle

#### UC-05: Create JobDescription (Draft)

- **Actor:** RecruitingOfficer
- **Preconditions:** Actor is authenticated; referenced Company exists
- **Flow:**
  1. Actor provides job description data (title, description, requirements, companyId)
  2. System creates JobDescription with status `DRAFT`
- **Postconditions:** JobDescription exists in `DRAFT` status
- **Note:** Fields may be incomplete at this stage — drafts can be saved without full validation

#### UC-06: Edit JobDescription

- **Actor:** RecruitingOfficer
- **Preconditions:** Actor is authenticated; JobDescription exists and is in `DRAFT` status
- **Flow:**
  1. Actor provides updated fields (title, description, requirements, companyId)
  2. System updates the JobDescription
- **Postconditions:** JobDescription reflects the changes
- **Business rule:** Only drafts can be edited. Published or canceled JobDescriptions are immutable.

#### UC-07: Publish JobDescription

- **Actor:** RecruitingOfficer
- **Preconditions:** Actor is authenticated; JobDescription is in `DRAFT` status
- **Flow:**
  1. Actor requests publication of a JobDescription
  2. System validates all required fields are present (title, description, companyId)
  3. System changes status from `DRAFT` to `PUBLISHED`
  4. System generates a public link for applicants
- **Postconditions:** JobDescription is publicly accessible via direct link
- **Business rule:** Cannot publish without title, description, and assigned company

#### UC-08: Cancel JobDescription

- **Actor:** RecruitingOfficer
- **Preconditions:** Actor is authenticated; JobDescription is in `PUBLISHED` status
- **Flow:**
  1. Actor requests cancellation
  2. System changes status from `PUBLISHED` to `CANCELED`
- **Postconditions:** JobDescription is no longer accessible to applicants; existing applications are preserved
- **Business rule:** Only published JobDescriptions can be canceled

---

### 2.4 Application Flow

#### UC-09: View JobDescription (Public)

- **Actor:** Guest/Applicant
- **Preconditions:** Guest has a valid direct link; JobDescription is in `PUBLISHED` status
- **Flow:**
  1. Guest accesses the public link
  2. System returns JobDescription details (title, description, requirements, company info)
- **Postconditions:** None (read-only)
- **Error case:** If JobDescription is not published (draft, canceled), system returns an appropriate error

#### UC-10: Apply to JobDescription

- **Actor:** Guest/Applicant
- **Preconditions:** JobDescription is in `PUBLISHED` status
- **Flow:**
  1. Guest provides applicant data (name, email, phone) and uploads CV (PDF)
  2. System checks eligibility via `ApplicationEligibilityService`:
     - Looks up Applicant by email
     - If Applicant exists: verifies no prior application to this JobDescription
     - If Applicant does not exist: creates new Applicant
  3. System stores CV in MinIO
  4. System creates JobApplication with status `RECEIVED`, referencing `applicantId` and `jobDescriptionId`
- **Postconditions:** JobApplication exists; Applicant exists; CV is stored
- **Business rule:** One application per Applicant (by email) per JobDescription
- **Domain Service:** `ApplicationEligibilityService.canApply(email, jobDescriptionId)`

---

### 2.5 Application Review

#### UC-11: List Applications for a JobDescription

- **Actor:** RecruitingOfficer
- **Preconditions:** Actor is authenticated; JobDescription exists
- **Flow:**
  1. Actor selects a JobDescription
  2. System returns all JobApplications for that JobDescription, including Applicant info
- **Postconditions:** None (read-only)

#### UC-12: Change JobApplication Status

- **Actor:** RecruitingOfficer
- **Preconditions:** Actor is authenticated; JobApplication exists
- **Flow:**
  1. Actor selects a JobApplication and a new status
  2. System validates the status transition
  3. System updates the status
- **Postconditions:** JobApplication reflects the new status
- **Valid transitions:**
  - `RECEIVED` → `UNDER_REVIEW`
  - `UNDER_REVIEW` → `ACCEPTED`
  - `UNDER_REVIEW` → `REJECTED`

---

## 3. Use Case Map by Actor

```
RecruitingOfficer:
  ├── UC-01: Login
  ├── UC-02: Create RecruitingOfficer
  ├── UC-03: Create Company
  ├── UC-04: List Companies
  ├── UC-05: Create JobDescription (Draft)
  ├── UC-06: Edit JobDescription
  ├── UC-07: Publish JobDescription
  ├── UC-08: Cancel JobDescription
  ├── UC-11: List Applications for JobDescription
  └── UC-12: Change JobApplication Status

Guest/Applicant:
  ├── UC-09: View JobDescription (Public)
  └── UC-10: Apply to JobDescription
```

---

## 4. State Machines

### JobDescription Lifecycle

```
  DRAFT ──────> PUBLISHED ──────> CANCELED
    │
    └── (editable)   (immutable)    (immutable)
```

### JobApplication Lifecycle

```
  RECEIVED ──────> UNDER_REVIEW ──────> ACCEPTED
                        │
                        └──────────────> REJECTED
```

---

## 5. Pending Decisions

| ID   | Decision                                                                 | Status  |
| ---- | ------------------------------------------------------------------------ | ------- |
| PD-1 | Should a canceled JobDescription be re-publishable?                      | Open    |
| PD-2 | Should the RecruitingOfficer see the Applicant's CV inline or download?  | Open    |
| PD-3 | Logout: token invalidation strategy (blacklist vs. short-lived tokens)?  | Open    |
