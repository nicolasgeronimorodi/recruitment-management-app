# Domain Analysis — Recruiting Management Platform

**Date:** 04/03/2026
**Status:** Approved

---

## 1. Overview

This document defines the domain model for a Recruiting Management Platform following Domain-Driven Design (DDD) principles. The platform allows Recruiting Officers to manage job descriptions and track applications from external candidates (Guests) who submit their CVs through public links.

---

## 2. Key DDD Concepts Applied

| Building Block    | Definition                                                    | Has Identity? | Has Lifecycle? |
| ----------------- | ------------------------------------------------------------- | ------------- | -------------- |
| **Entity**        | Object with a unique, persistent identity                     | Yes           | Yes            |
| **Value Object**  | Immutable object defined entirely by its attributes           | No            | No             |
| **Aggregate**     | Cluster of entities/VOs accessed through a single root entity | (root does)   | Yes            |
| **Aggregate Root**| The entry point entity that controls access to the aggregate  | Yes           | Yes            |

**Rule of thumb:** If two instances with identical data are "the same thing", it's a Value Object. If they can be "different things with the same data", it's an Entity.

---

## 3. Bounded Contexts

The system is divided into two bounded contexts:

```
┌─────────────────────────────┐    ┌────────────────────────────────────┐
│  Identity & Access (IAM)    │    │      Recruitment Core              │
│                             │    │                                    │
│  - User (Aggregate Root)    │    │  - Company (Aggregate Root)        │
│  - Role (Value Object)      │    │  - JobDescription (Aggregate Root) │
│                             │    │  - JobApplication (Entity)         │
│                             │    │  - Applicant (Aggregate Root)      │
└─────────────────────────────┘    └────────────────────────────────────┘
```

**Why two contexts?** `User` (someone with an account and credentials) and `Applicant` (an external person submitting a CV) are distinct domain concepts even though both represent people. Separating them avoids a monolithic model that tries to be everything at once.

---

## 4. Aggregates & Entities

### 4.1 User Aggregate (IAM Context)

- **User** — Aggregate Root
  - Has identity: `userId` (UUID)
  - Lifecycle: created → active → suspended → deactivated
  - Behavior: authenticate, assume permissions based on role
  - Contains:
    - **Role** — Value Object (enum: `RECRUITING_OFFICER`)
    - Credentials (email, hashed password)

> **Note:** `RecruitingOfficer` is not a separate entity. It is a *concept* expressed as `User` with `role = RECRUITING_OFFICER`. Domain logic like `user.canPublishJobDescription()` checks the role internally.

> **Note:** `Guest` is not a domain entity at all — it is an access control concept (unauthenticated user accessing a public link). It has no representation in the domain model.

### 4.2 Company Aggregate (Recruitment Context)

- **Company** — Aggregate Root
  - Has identity: `companyId` (UUID)
  - Lifecycle: created → active → archived
  - Invariants: must have a non-empty name, must have at least one country
  - Contains:
    - **Country** — Value Object (e.g., `Country("Argentina")`)
    - **Field** — Value Object collection (e.g., `["Technology", "Finance"]`)

> **Note:** `Country` and `Field` may exist as lookup/seed tables in the database for UI convenience, but in the domain model they are Value Objects — they have no identity of their own. `Country("Argentina")` always equals `Country("Argentina")`.

### 4.3 JobDescription Aggregate (Recruitment Context)

- **JobDescription** — Aggregate Root
  - Has identity: `jobDescriptionId` (UUID)
  - Lifecycle: draft → published → closed
  - Invariants: cannot be published without a title and an assigned company
  - References: `companyId` (cross-aggregate reference by ID, not by object)
  - Contains:
    - **JobApplication** — Entity (part of this aggregate)
      - Has identity: `jobApplicationId` (UUID)
      - Lifecycle: received → under_review → accepted → rejected
      - References: `applicantId` (cross-aggregate reference by ID)
      - Contains: submission date, status, optional notes

> **Important:** `JobApplication` is not an Aggregate Root. It does not exist independently — it is always accessed through its parent `JobDescription`. Operations like "get all applications" always go through `jobDescription.getApplications()`.

### 4.4 Applicant Aggregate (Recruitment Context)

- **Applicant** — Aggregate Root
  - Has identity: `applicantId` (UUID)
  - Natural key: `email` (used for deduplication)
  - Lifecycle: created (on first application) → persists across multiple applications
  - Properties: name, email, phone, CV document reference (MinIO path)
  - Invariants: email must be unique

> **Design decision:** `Applicant` is its own Aggregate Root (rather than a Value Object inside `JobApplication`) to support:
> 1. The business rule: *"An Applicant cannot submit more than one JobApplication for the same JobDescription"* (requires persistent identity to verify)
> 2. Cross-application traceability: *"This applicant has applied to 3 different positions"*

---

## 5. Domain Service

### ApplicationEligibilityService

This service exists because the business rule *"one application per applicant per job description"* spans two aggregates (`Applicant` and `JobDescription`), so it cannot live inside either one.

```
ApplicationEligibilityService:
  canApply(applicantEmail, jobDescriptionId) → boolean

  Flow:
    1. Look up Applicant by email
    2. If exists → check no existing JobApplication for this JobDescription
    3. If not exists → Applicant will be created as part of the application process
    4. Create JobApplication referencing Applicant.id and JobDescription.id
```

---

## 6. Summary: What Is NOT a Domain Entity

| Proposed Concept     | Actual DDD Classification                     |
| -------------------- | ---------------------------------------------- |
| Role                 | Value Object (enum) inside User aggregate      |
| RecruitingOfficer    | Concept expressed via `User.role`, not an entity|
| Guest                | Access control concept, no domain representation|
| Country              | Value Object inside Company aggregate          |
| Field                | Value Object (collection) inside Company       |

---

## 7. Aggregate Reference Map

```
User (AR)
  └── Role (VO, enum)

Company (AR)
  ├── Country (VO)
  └── Field[] (VO collection)

JobDescription (AR) ──ref──> Company.id
  └── JobApplication (Entity) ──ref──> Applicant.id

Applicant (AR)
  └── (CV stored externally in MinIO, referenced by path)
```

Cross-aggregate references are always **by ID**, never by direct object reference. This maintains aggregate boundaries and allows each aggregate to be persisted independently.
