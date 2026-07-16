# Progress Tracker

A full-stack **Project Monitoring and Evaluation Platform** designed to help teams manage projects, track implementation progress, monitor activities, record challenges, manage beneficiaries, review financial data, import spreadsheet records, generate reports, and present project insights through a professional **Presentation Mode**.

The platform is built for organizations that need a structured way to monitor multiple projects, improve reporting accuracy, and present progress updates clearly during meetings, reviews, and online presentations.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [New Feature: Project Presentation Mode](#new-feature-project-presentation-mode)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Core Modules](#core-modules)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Database and Supabase](#database-and-supabase)
- [Authentication and Authorization](#authentication-and-authorization)
- [API Overview](#api-overview)
- [Spreadsheet Import Workflow](#spreadsheet-import-workflow)
- [Reports and Exports](#reports-and-exports)
- [Notifications](#notifications)
- [Deployment](#deployment)
- [Testing Checklist](#testing-checklist)
- [Future Improvements](#future-improvements)
- [Author](#author)

---

## Overview

**Progress Tracker** is a modern web-based platform for managing and monitoring project implementation. It helps teams move away from scattered spreadsheets, manual reporting, and disconnected project records by providing one centralized system for project data.

The system allows users to:

- Create and manage projects.
- Track project activities and progress.
- Record updates, challenges, beneficiaries, and financial entries.
- Import structured data from spreadsheets.
- Review and edit imported records.
- Generate project reports.
- Receive overdue task notifications.
- Present project performance through a full-screen presentation view.

The platform is especially useful for project officers, supervisors, finance teams, administrators, and organizations that need regular progress reporting.

---

## Key Features

### 1. Multi-Project Management

Users can manage multiple projects from a single platform.

Features include:

- Project creation and selection.
- Project-specific dashboards.
- Project member management.
- Role-based access per project.
- Project switching.
- Project overview and performance tracking.

---

### 2. Dashboard Overview

The dashboard gives users a quick view of project performance.

It includes:

- Project summary cards.
- Activity progress indicators.
- Recent updates.
- Challenge summaries.
- Beneficiary statistics.
- Financial highlights.
- Project status overview.

---

### 3. Work Plan and Activity Tracking

The platform supports structured activity tracking for each project.

Users can record:

- Activity names.
- Start and end dates.
- Progress percentage.
- Status.
- Responsible officers.
- Related updates.
- Delays and pending work.

This helps teams understand which activities are completed, ongoing, delayed, or not yet started.

---

### 4. Progress Updates

Users can submit regular project progress updates.

Progress updates help capture:

- What has been achieved.
- Current implementation status.
- Field updates.
- Progress percentage.
- Supporting comments.
- Recent developments.

These updates are used in dashboards, reports, and the new presentation mode.

---

### 5. Challenges and Mitigation Tracking

The platform allows teams to record project challenges and mitigation measures.

Users can track:

- Challenge title.
- Description.
- Status.
- Mitigation actions.
- Responsible persons.
- Resolution progress.

This improves accountability and helps management understand what is blocking implementation.

---

### 6. Beneficiary Management

The system supports beneficiary tracking for project impact reporting.

Users can capture:

- Beneficiary records.
- Beneficiary categories or types.
- Totals by group.
- Project-level beneficiary summaries.

This is useful for impact reports, donor reporting, government reporting, and executive presentations.

---

### 7. Financial Tracking

The platform includes financial tracking functionality for project monitoring.

It can support:

- Budget records.
- Financial entries.
- Approved amounts.
- Pending amounts.
- Rejected amounts.
- Spending summaries.
- Financial visibility based on user roles.

This helps teams connect financial performance with implementation progress.

---

### 8. Spreadsheet Import System

The platform includes a spreadsheet import feature to reduce manual data entry.

Supported functionality includes:

- Uploading spreadsheet files.
- Reading spreadsheet data.
- Mapping imported columns to system fields.
- Previewing imported data before saving.
- Editing imported records.
- Handling duplicate records.
- Import history tracking.
- Reviewing imported records in an editable overview area.

This feature is useful when project data already exists in Excel files and needs to be moved into the system.

---

### 9. Editable Imported Data Review

After importing spreadsheet data, users can review and correct records inside the platform.

This helps ensure:

- Imported values are accurate.
- Data errors are corrected before reporting.
- Project records remain clean and reliable.
- Users do not have to return to Excel for every correction.

---

### 10. Reports and Exports

The platform supports report generation and export functionality.

Reports may include:

- Project summaries.
- Progress reports.
- Financial summaries.
- Activity reports.
- Imported data summaries.
- Downloadable report outputs.

The backend includes report-generation support for structured project reporting.

---

### 11. Email Notifications

The platform includes an overdue task notification system.

This allows the system to remind users about:

- Overdue activities.
- Delayed tasks.
- Pending project responsibilities.

The notification system is designed to improve follow-up and reduce missed deadlines.

---

### 12. Role-Based Access Control

The platform supports project-level access control.

Different users can have different permissions depending on their role, such as:

- Administrator
- Supervisor
- Project officer
- Finance user
- Viewer or limited-access user

This ensures that users only access the project information they are allowed to see.

---

## New Feature: Project Presentation Mode

The latest major feature is **Project Presentation Mode**.

This feature was designed because the platform is intended to be used during online meetings, reporting sessions, and executive project presentations.

Instead of manually preparing slides from project data, users can open a clean full-screen presentation view generated from live project records.

---

### Presentation Mode Route

```txt
/projects/:projectId/presentation
```

---

## Environment Variables

### Supabase Edge Function Secrets

The overdue reminder Edge Function reads email configuration from Supabase secrets. Set these before deploying or invoking `send-overdue-reminders`:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set FROM_EMAIL="Project Tracker <noreply@example.com>"
```

Do not commit API keys or hardcode provider credentials. The function also relies on the standard Supabase Edge runtime secrets for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
