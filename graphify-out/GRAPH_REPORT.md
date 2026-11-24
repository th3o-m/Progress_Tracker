# Graph Report - Project-Tracker  (2026-11-24)

## Corpus Check
- 175 files · ~68,028 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 9, .css 8, .toml 1)

## Summary
- 1512 nodes · 3289 edges · 131 communities (80 shown, 51 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4287002f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ImportSpreadsheet.tsx
- Shared Display Components
- Sidebar and Panel Components
- Application Navigation and Authentication
- Imported Data Review
- Spreadsheet Parsing
- Backend Middleware and Configuration
- Interactive Input Components
- http.ts
- Scheduled Reminder Delivery
- Future Predictive Intelligence module
- Stabilization CI Workflow
- dependencies
- Dashboard Overview and Challenges
- Progress Tracking Interface
- Project Settings and Membership
- invitations.controller.ts
- Request Validation Schemas
- Core Database Schema
- alert-dialog.tsx
- Invitation Acceptance Workflow
- frontend/package.json
- Project Data Entry
- Backend Package Configuration
- getPagination
- Project Summary and Presentation
- Backend Integration Tests
- Frontend Build Tooling
- Reminder Automation Workflow
- Frontend TypeScript Configuration
- 0002_multi_project.sql
- Menubar Components
- Form Field Components
- Status and Toggle Components
- ImportSpreadsheet
- notifications.controller.ts
- Backend TypeScript Configuration
- Carousel Components
- Invitation Interface and API
- README.md
- reportImports.controller.ts
- Backend Runtime Dependencies
- Supabase Diagnostic Scripts
- Chart Components
- Drawer Components
- Select Components
- NotificationsBell.tsx
- report.service.ts
- Navigation Menu Components
- api.ts
- auth.controller.ts
- Progress Tracker
- Project Switcher Memberships
- Dashboard Design Requirements
- Backend Development Scripts
- Profile Backfill Utility
- Authentication Domain Types
- context-menu.tsx
- Persistent Notification Storage
- Theme and Toast Libraries
- Collapsible Components
- Dashboard Visual Mockup
- Financial Report Storage
- Reminder Settings Storage
- Optional React Peers
- Original Dashboard Proposal
- Atomic Invitation Design
- public.projects
- Aspect Ratio Components
- React Peer Dependencies
- Frontend Development Scripts
- Phase 0 stabilization
- Node Runtime Requirements
- clsx
- apiRequest
- Carousel React Library
- public.profiles
- Protected deployment verification
- public.accept_project_invitation
- Material Icon Library
- Project Tracker UI Rules
- check-import-parser.ts
- Atomic invitation acceptance: deployment and verification
- @emotion/react@11.14.0
- Radix Menubar Library
- @popperjs/core@2.11.8
- Isolated hosted staging
- @radix-ui/react-alert-dialog
- Environment Variables
- Vercel backend deployment
- @radix-ui/react-avatar
- Scripts
- AGENTS.md
- canvas-confetti@1.9.4
- date-fns@3.6.0
- @radix-ui/react-dialog
- input-otp
- @radix-ui/react-popover
- @radix-ui/react-scroll-area
- Package Workspace Configuration
- Component License Attribution
- Photo License Attribution
- Application HTML Shell
- @radix-ui/react-slider
- @radix-ui/react-checkbox
- @radix-ui/react-tabs
- react-dnd@16.0.1
- react-responsive-masonry@2.7.1
- @radix-ui/react-navigation-menu
- @radix-ui/react-select
- @radix-ui/react-toggle-group
- react-popper@2.3.0
- tailwind-merge
- react-resizable-panels
- ProjectPresentation.tsx
- vaul

## God Nodes (most connected - your core abstractions)
1. `cn()` - 223 edges
2. `throwDb()` - 81 edges
3. `react` - 63 edges
4. `ApiError` - 58 edges
5. `apiRequest()` - 45 edges
6. `auditLog()` - 42 edges
7. `lucide-react` - 38 edges
8. `parseBody()` - 36 edges
9. `ImportSpreadsheet()` - 33 edges
10. `express` - 33 edges

## Surprising Connections (you probably didn't know these)
- `Account loading integration` --semantically_similar_to--> `Vercel Services backend routing`  [INFERRED] [semantically similar]
  README.md → docs/vercel-backend.md
- `Progress Tracker` --references--> `Phase 0 stabilization`  [EXTRACTED]
  README.md → docs/phase-0-stabilization.md
- `Progress Tracker` --references--> `Future Predictive Intelligence module`  [EXTRACTED]
  README.md → docs/predictive-intelligence.md
- `Progress Tracker` --references--> `Project Tracker 2.0 release sequence`  [EXTRACTED]
  README.md → docs/product-roadmap.md
- `Progress Tracker` --references--> `Project Tracker UI Rules`  [EXTRACTED]
  README.md → frontend/guidelines/Guidelines.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Release verification layers** — docs_phase_0_stabilization_integration_tests, docs_phase_0_stabilization_hosted_staging, docs_phase_0_stabilization_release_gates [EXTRACTED 1.00]
- **Planned forecast safety controls** — docs_predictive_intelligence_governance, docs_predictive_intelligence_tenant_isolation, docs_predictive_intelligence_human_review [EXTRACTED 1.00]

## Communities (131 total, 51 thin omitted)

### Community 0 - "ImportSpreadsheet.tsx"
Cohesion: 0.09
Nodes (35): chooseDate(), definedPayload(), displayMoney(), displayPercent(), DuplicateMode, existingActivityFor(), existingFinancialFor(), firstOfficerId() (+27 more)

### Community 1 - "Shared Display Components"
Cohesion: 0.06
Nodes (41): AccordionContent(), AccordionItem(), AccordionTrigger(), Avatar(), AvatarFallback(), AvatarImage(), BreadcrumbEllipsis(), BreadcrumbItem() (+33 more)

### Community 2 - "Sidebar and Panel Components"
Cohesion: 0.06
Nodes (43): Input(), Separator(), Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+35 more)

### Community 3 - "Application Navigation and Authentication"
Cohesion: 0.08
Nodes (29): activityRouteFromPath(), App(), Challenges, DataEntry, demoMembership, getInitialTheme(), hasPasswordRecoveryToken(), ImportedDataReview (+21 more)

### Community 4 - "Imported Data Review"
Cohesion: 0.07
Nodes (43): clone(), colorOptions, currentRecordsImport(), emptyToNull(), Field(), ImportedActivity, ImportedChallenge, ImportedDataReview() (+35 more)

### Community 5 - "Spreadsheet Parsing"
Cohesion: 0.16
Nodes (35): cellText(), compact(), editDistance(), fieldAliases, findLabelValue(), findProjectStatusHeader(), getByHeader(), HeaderMap (+27 more)

### Community 6 - "Backend Middleware and Configuration"
Cohesion: 0.16
Nodes (19): EmailMessage, sendEmail(), alreadySentToday(), buildEmail(), completedStatuses, escapeHtml(), getFallbackRecipients(), getProfiles() (+11 more)

### Community 7 - "Interactive Input Components"
Cohesion: 0.07
Nodes (16): Checkbox(), HoverCardContent(), InputOTP(), InputOTPGroup(), InputOTPSlot(), PopoverContent(), RadioGroup(), RadioGroupItem() (+8 more)

### Community 8 - "http.ts"
Cohesion: 0.13
Nodes (26): deleteProfile(), generateReport(), listReports(), projectAccess(), requireOrgAdmin(), requireRole(), activitiesRouter, membersRouter (+18 more)

### Community 9 - "Scheduled Reminder Delivery"
Cohesion: 0.08
Nodes (27): buildEmail(), completedStatuses, corsHeaders, emptyResult(), escapeHtml(), formatDate(), Frequency, frequencyDays (+19 more)

### Community 10 - "Future Predictive Intelligence module"
Cohesion: 0.25
Nodes (5): Proposed prediction data contracts, Future Predictive Intelligence module, Predictive data foundations, Project Tracker 2.0 release sequence, Planned tenant-aware workspace core

### Community 11 - "Stabilization CI Workflow"
Cohesion: 0.07
Nodes (30): concurrency, cancel-in-progress, group, runs-on, steps, strategy, timeout-minutes, jobs (+22 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (29): dependencies, class-variance-authority@0.7.1, cmdk@1.1.1, @emotion/styled@11.14.1, lucide-react@0.487.0, @mui/material@7.3.5, @radix-ui/react-context-menu@2.2.6, @radix-ui/react-dropdown-menu@2.1.6 (+21 more)

### Community 13 - "Dashboard Overview and Challenges"
Cohesion: 0.20
Nodes (15): Challenges(), Filter, formatDate(), EmptyState(), LoadingScreen(), badge, emptySummary, OverviewProps (+7 more)

### Community 14 - "Progress Tracking Interface"
Cohesion: 0.13
Nodes (22): colors, ProgressTracking(), canEditUpdate(), openUpdate(), ProgressTrackingProps, Command(), CommandDialog(), CommandGroup() (+14 more)

### Community 15 - "Project Settings and Membership"
Cohesion: 0.20
Nodes (11): MemberDraft, ProjectInvitation, ActivityDraft, ActivityPage(), ActivityPageProps, CurrentUserResponse, formatDate(), formatText() (+3 more)

### Community 16 - "invitations.controller.ts"
Cohesion: 0.20
Nodes (19): AcceptanceResult, acceptInvitation(), addDays(), assertUsableInvitation(), assertVisibleInvitation(), createProjectInvitation(), generateUniqueToken(), getInvitationByToken() (+11 more)

### Community 17 - "Request Validation Schemas"
Cohesion: 0.07
Nodes (32): approveFinancialEntry(), decide(), rejectFinancialEntry(), activitySchema, createChallengeSchema, createFinancialSchema, createNotificationSchema, createProfileSchema (+24 more)

### Community 18 - "Core Database Schema"
Cohesion: 0.13
Nodes (23): activities_district_idx, activities_officer_idx, challenges_activity_idx, financial_activity_idx, financial_status_idx, progress_activity_idx, progress_officer_idx, public.activities (+15 more)

### Community 19 - "alert-dialog.tsx"
Cohesion: 0.11
Nodes (19): AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay(), AlertDialogPortal() (+11 more)

### Community 20 - "Invitation Acceptance Workflow"
Cohesion: 0.22
Nodes (29): createActivity(), deleteActivity(), getActivity(), updateActivity(), addProjectMember(), updateProjectMember(), createChallenge(), deleteChallenge() (+21 more)

### Community 21 - "frontend/package.json"
Cohesion: 0.08
Nodes (23): motion@12.23.24, @radix-ui/react-accordion@1.2.3, @radix-ui/react-hover-card@1.1.6, @radix-ui/react-progress@1.1.2, @radix-ui/react-separator@1.1.2, @radix-ui/react-switch@1.1.3, react-slick@0.31.0, @supabase/supabase-js@^2.50.0 (+15 more)

### Community 22 - "Project Data Entry"
Cohesion: 0.20
Nodes (20): blank, DataEntry(), Tab, today, Reports(), Context, DatasetState, FinancialReport (+12 more)

### Community 23 - "Backend Package Configuration"
Cohesion: 0.14
Nodes (19): devDependencies, pino-pretty@^13.0.0, tsx@^4.20.0, @types/cors@^2.8.18, @types/express@^5.0.3, @types/node@^22.15.0, @types/pdfkit@^0.17.2, typescript@^5.8.0 (+11 more)

### Community 24 - "getPagination"
Cohesion: 0.25
Nodes (15): listActivities(), listProjectMembers(), listChallenges(), listFinancialEntries(), createFinancialReport(), listFinancialReports(), normalizeReport(), listProfiles() (+7 more)

### Community 25 - "Project Summary and Presentation"
Cohesion: 0.35
Nodes (13): buildExecutiveSummary(), countByStatus(), financialReportMetrics(), firstText(), getProjectPresentation(), getProjectSummary(), isCompletedStatus(), isInProgressStatus() (+5 more)

### Community 26 - "Backend Integration Tests"
Cohesion: 0.09
Nodes (4): ./dist/app.js, child, deadline, project

### Community 27 - "Frontend Build Tooling"
Cohesion: 0.12
Nodes (15): devDependencies, tailwindcss@4.1.12, @tailwindcss/vite@4.1.12, @types/react@18.3.28, @types/react-dom@18.3.7, typescript@5.9.3, vite@6.3.5, @vitejs/plugin-react@4.7.0 (+7 more)

### Community 28 - "Reminder Automation Workflow"
Cohesion: 0.11
Nodes (18): concurrency, cancel-in-progress, group, REMINDER_CRON_SECRET, SUPABASE_URL, jobs, send, name (+10 more)

### Community 29 - "Frontend TypeScript Configuration"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, allowSyntheticDefaultImports, baseUrl, esModuleInterop, jsx, lib, module (+9 more)

### Community 30 - "0002_multi_project.sql"
Cohesion: 0.22
Nodes (10): beneficiaries_district_idx, public.beneficiaries, public.reports, beneficiaries_project_idx, progress_updates_project_idx, project_members_user_idx, public.is_org_admin(), public.project_members (+2 more)

### Community 31 - "Menubar Components"
Cohesion: 0.12
Nodes (12): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarPortal(), MenubarRadioItem(), MenubarSeparator() (+4 more)

### Community 32 - "Form Field Components"
Cohesion: 0.18
Nodes (13): @radix-ui/react-label@2.1.2, FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue (+5 more)

### Community 33 - "Status and Toggle Components"
Cohesion: 0.17
Nodes (12): Alert(), AlertDescription(), AlertTitle(), alertVariants, Badge(), badgeVariants, ToggleGroup(), ToggleGroupContext (+4 more)

### Community 34 - "ImportSpreadsheet"
Cohesion: 0.11
Nodes (13): xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/x..., Field(), ImportSpreadsheet(), findReportDuplicate(), loadSelectedProjectData(), previewSheet(), resetImport(), uploadFile() (+5 more)

### Community 35 - "notifications.controller.ts"
Cohesion: 0.13
Nodes (22): app, env, result, schema, assertProjectAccess(), completedActivityStatuses, createNotification(), formatDueDate() (+14 more)

### Community 36 - "Backend TypeScript Configuration"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule (+6 more)

### Community 37 - "Carousel Components"
Cohesion: 0.19
Nodes (14): Button(), Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext() (+6 more)

### Community 38 - "Invitation Interface and API"
Cohesion: 0.28
Nodes (7): AcceptedInvitationProject, AcceptInvitationResponse, InvitationDetails, InvitationPage(), acceptInvitation(), messageForError(), roleLabel

### Community 39 - "README.md"
Cohesion: 0.04
Nodes (43): Acceptance criteria for first production KPI, API sketch (not implemented), Delivery sequence, Initial supported outcomes (proposed), Logical architecture, Model governance and safety, Predictive Intelligence — Future Technical Blueprint, Required data contracts (design proposal, not existing schema) (+35 more)

### Community 40 - "reportImports.controller.ts"
Cohesion: 0.47
Nodes (5): getImport(), getReportImportReview(), updateReportImportReviewStatus(), reportImportSchema, updateReportImportReviewSchema

### Community 41 - "Backend Runtime Dependencies"
Cohesion: 0.15
Nodes (13): dependencies, cors@^2.8.5, express@^5.1.0, helmet@^8.1.0, pino@^9.7.0, pino-http@^10.4.0, @supabase/supabase-js@^2.50.0, zod@4.6.7 (+5 more)

### Community 42 - "Supabase Diagnostic Scripts"
Cohesion: 0.18
Nodes (7): dotenv@^16.5.0, authIds, profileIds, supabase, password, supabase, dotenv

### Community 43 - "Chart Components"
Cohesion: 0.27
Nodes (10): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartStyle(), ChartTooltipContent(), getPayloadConfigFromPayload() (+2 more)

### Community 44 - "Drawer Components"
Cohesion: 0.22
Nodes (7): DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerPortal(), DrawerTitle()

### Community 45 - "Select Components"
Cohesion: 0.22
Nodes (7): SelectContent(), SelectItem(), SelectLabel(), SelectScrollDownButton(), SelectScrollUpButton(), SelectSeparator(), SelectTrigger()

### Community 46 - "NotificationsBell.tsx"
Cohesion: 0.15
Nodes (15): BackendNotification, completedStatuses, formatDate(), isOverdue(), logNotificationRequestError(), normalizeStatus(), NotificationItem, NotificationsBell() (+7 more)

### Community 47 - "report.service.ts"
Cohesion: 0.28
Nodes (8): exceljs@^4.4.0, pdfkit@^0.17.1, buildExcel(), buildPdf(), display(), ReportData, exceljs, pdfkit

### Community 48 - "Navigation Menu Components"
Cohesion: 0.24
Nodes (9): NavigationMenu(), NavigationMenuContent(), NavigationMenuIndicator(), NavigationMenuItem(), NavigationMenuLink(), NavigationMenuList(), NavigationMenuTrigger(), navigationMenuTriggerStyle (+1 more)

### Community 49 - "api.ts"
Cohesion: 0.21
Nodes (9): LoginProps, Mode, apiUrl, ApiRequestError, parseApiResponse(), anonKey, isSupabaseConfigured, supabase (+1 more)

### Community 50 - "auth.controller.ts"
Cohesion: 0.23
Nodes (11): supabase, getCurrentUser(), removeProjectMember(), deleteProject(), getProject(), addProjectMemberSchema, updateProjectMemberSchema, assertDistrict() (+3 more)

### Community 51 - "Progress Tracker"
Cohesion: 0.12
Nodes (17): Backend, Database And Supabase, Local demo mode, Deployment, Frontend, Installation, Maintenance Scripts, Notes (+9 more)

### Community 52 - "Project Switcher Memberships"
Cohesion: 0.39
Nodes (7): Project, ProjectMembership, ProjectSwitcherProps, isProject(), isRecord(), isRole(), normalizeProjectMemberships()

### Community 53 - "Dashboard Design Requirements"
Cohesion: 0.25
Nodes (7): Chart and Table Drill Down, Dashboard Layout Sketch, ABS Phase II Botswana dashboard requirements, Project Data Storage, Reports and Export, Role Based Access Control, Visualization and Charts

### Community 54 - "Backend Development Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, start, test:frontend-lib, test:integration, test:project-memberships, typecheck

### Community 55 - "Profile Backfill Utility"
Cohesion: 0.29
Nodes (5): apply, missing, profileIds, rows, supabase

### Community 56 - "Authentication Domain Types"
Cohesion: 0.38
Nodes (5): AuthUser, ProjectContext, roles, Express, Request

### Community 57 - "context-menu.tsx"
Cohesion: 0.12
Nodes (9): ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut(), ContextMenuSubContent() (+1 more)

### Community 58 - "Persistent Notification Storage"
Cohesion: 0.60
Nodes (5): notifications_created_at_idx, notifications_is_read_idx, notifications_project_idx, notifications_user_idx, public.notifications

### Community 59 - "Theme and Toast Libraries"
Cohesion: 0.33
Nodes (4): next-themes@0.4.6, sonner@2.0.3, next-themes, sonner

### Community 61 - "Dashboard Visual Mockup"
Cohesion: 0.33
Nodes (6): Dashboard Charts and Visualizations, ABS Phase II Project Dashboard Mock-up, Planned Versus Actual Timeline, Dashboard Implementation Suggestions, Project Officer Data Entry, Activity Overview Summary

### Community 62 - "Financial Report Storage"
Cohesion: 0.50
Nodes (3): project_financial_reports_project_idx, public.project_financial_reports, project_financial_reports_history_idx

### Community 63 - "Reminder Settings Storage"
Cohesion: 0.70
Nodes (4): project_reminder_settings_due_idx, project_reminder_settings_updated_at, public.project_reminder_settings, public.set_project_reminder_settings_updated_at()

### Community 64 - "Optional React Peers"
Cohesion: 0.40
Nodes (5): peerDependenciesMeta, react, react-dom, optional, optional

### Community 65 - "Original Dashboard Proposal"
Cohesion: 0.50
Nodes (5): Dashboard Navigation, ABS Phase II Dashboard Proposal, Activity Progress Tracking, Secure Project Officer Data Entry, Planned Activities and Work Plans

### Community 67 - "public.projects"
Cohesion: 0.23
Nodes (9): projects_created_by_idx, public.projects, project_report_imports_project_idx, public.project_report_imports, project_report_imports_project_idx, public.project_report_imports, overdue_task_notifications_lookup_idx, overdue_task_notifications_project_sent_idx (+1 more)

### Community 69 - "React Peer Dependencies"
Cohesion: 0.50
Nodes (4): peerDependencies, react@18.3.1, react-dom@18.3.1, react-dom

### Community 70 - "Frontend Development Scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, typecheck

### Community 71 - "Phase 0 stabilization"
Cohesion: 0.20
Nodes (9): Audit follow-up, CI and production release criteria, Current evidence and gaps, HTTP integration fixtures, Isolated hosted staging configuration, Phase 0 stabilization, Reproducible verification, Rollback (+1 more)

### Community 74 - "apiRequest"
Cohesion: 0.13
Nodes (26): submit(), getDraft(), initials(), isDraftChanged(), MemberCard(), OverdueReminderHistoryItem, OverdueReminderResult, permissions (+18 more)

### Community 76 - "public.profiles"
Cohesion: 0.38
Nodes (4): public.profiles, on_auth_user_created, public.handle_new_auth_user(), public.project_report_imports

### Community 77 - "Protected deployment verification"
Cohesion: 0.29
Nodes (5): Express source entrypoint packaging, Protected deployment verification, Vercel Services backend routing, Express TypeScript backend, Supabase authentication and persistence

### Community 78 - "public.accept_project_invitation"
Cohesion: 0.24
Nodes (7): audit_user_created_idx, public.audit_log, project_invitations_created_by_idx, project_invitations_expires_idx, project_invitations_project_idx, public.project_invitations, public.accept_project_invitation()

### Community 80 - "Project Tracker UI Rules"
Cohesion: 0.33
Nodes (5): UI HCI pull request checklist, WCAG 2.2 AA accessibility target, Responsive SaaS grids, Semantic theme tokens, Project Tracker UI Rules

### Community 81 - "check-import-parser.ts"
Cohesion: 0.67
Nodes (3): sampleRows(), sheetNames, shifted()

### Community 82 - "Atomic invitation acceptance: deployment and verification"
Cohesion: 0.33
Nodes (5): Atomic invitation acceptance: deployment and verification, Deploy order, Expected behavior, Scope note, Tests to run against a disposable Supabase test project

### Community 88 - "Environment Variables"
Cohesion: 0.40
Nodes (5): Backend, Environment Variables, Frontend, Scheduled overdue reminders, Supabase Edge Function Secrets

### Community 89 - "Vercel backend deployment"
Cohesion: 0.50
Nodes (3): Checks before release, Entrypoint and packaging, Vercel backend deployment

### Community 91 - "Scripts"
Cohesion: 0.67
Nodes (3): Backend, Frontend, Scripts

### Community 128 - "ProjectPresentation.tsx"
Cohesion: 0.31
Nodes (7): Progress(), EmptyLine(), formatDate(), formatMoney(), MetricCard(), PresentationData, ProjectPresentation()

## Knowledge Gaps
- **26 isolated node(s):** `./dist/app.js`, `Project Data Storage`, `Reports and Export`, `Role Based Access Control`, `Chart and Table Drill Down` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 468 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Interactive Input Components` to `ImportSpreadsheet.tsx`, `Shared Display Components`, `Sidebar and Panel Components`, `Application Navigation and Authentication`, `Imported Data Review`, `ProjectPresentation.tsx`, `Dashboard Overview and Challenges`, `Progress Tracking Interface`, `Project Settings and Membership`, `alert-dialog.tsx`, `frontend/package.json`, `Project Data Entry`, `Menubar Components`, `Form Field Components`, `Status and Toggle Components`, `Carousel Components`, `Invitation Interface and API`, `Chart Components`, `Drawer Components`, `Select Components`, `NotificationsBell.tsx`, `Navigation Menu Components`, `api.ts`, `Project Switcher Memberships`, `context-menu.tsx`, `React Peer Dependencies`, `apiRequest`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `throwDb()` (e.g. with `getReportImportReview()` and `runOverdueTaskNotifications()`) actually correct?**
  _`throwDb()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./dist/app.js`, `Project Data Storage`, `Reports and Export` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ImportSpreadsheet.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0915915915915916 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Dashboard Overview and Challenges` to `ImportSpreadsheet.tsx`, `Shared Display Components`, `Sidebar and Panel Components`, `Application Navigation and Authentication`, `Imported Data Review`, `ProjectPresentation.tsx`, `Interactive Input Components`, `dependencies`, `Progress Tracking Interface`, `Project Settings and Membership`, `alert-dialog.tsx`, `frontend/package.json`, `Project Data Entry`, `Menubar Components`, `Carousel Components`, `Invitation Interface and API`, `Select Components`, `NotificationsBell.tsx`, `Navigation Menu Components`, `api.ts`, `Project Switcher Memberships`, `context-menu.tsx`, `apiRequest`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Should `Shared Display Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06168831168831169 - nodes in this community are weakly interconnected._
- **Why does `Progress Tracker` connect `Progress Tracker` to `Phase 0 stabilization`, `README.md`, `Future Predictive Intelligence module`, `Protected deployment verification`, `Project Tracker UI Rules`, `Environment Variables`, `Scripts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._