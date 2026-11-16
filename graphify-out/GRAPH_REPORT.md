# Graph Report - Progress_Tracker  (2026-11-16)

## Corpus Check
- 178 files · ~68,638 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: (none) 9, .css 6, .toml 1)

## Summary
- 1439 nodes · 3220 edges · 117 communities (68 shown, 49 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Spreadsheet Import Workflow
- Shared Display Components
- Sidebar and Panel Components
- Application Navigation and Authentication
- Imported Data Review
- Spreadsheet Parsing
- Backend Middleware and Configuration
- Interactive Input Components
- Financial and Import Controllers
- Scheduled Reminder Delivery
- Product Plans and Verification
- Stabilization CI Workflow
- Frontend Component Dependencies
- Dashboard Overview and Challenges
- Progress Tracking Interface
- Project Settings and Membership
- Challenge and Finance Operations
- Request Validation Schemas
- Core Database Schema
- Dialogs and Dropdowns
- Invitation Acceptance Workflow
- Frontend Package Configuration
- Project Data Entry
- Backend Package Configuration
- Profile and Membership Management
- Project Summary and Presentation
- Backend Integration Tests
- Frontend Build Tooling
- Reminder Automation Workflow
- Frontend TypeScript Configuration
- Project Membership Database
- Menubar Components
- Form Field Components
- Status and Toggle Components
- Context Menu Components
- Notification Controller
- Backend TypeScript Configuration
- Carousel Components
- Invitation Interface and API
- Vercel Deployment Configuration
- API Route Composition
- Backend Runtime Dependencies
- Supabase Diagnostic Scripts
- Chart Components
- Drawer Components
- Select Components
- Activity Detail Editor
- Activity CRUD Operations
- Navigation Menu Components
- Project Presentation Interface
- Excel and PDF Reports
- Invitation Database Functions
- Project Switcher Memberships
- Dashboard Design Requirements
- Backend Development Scripts
- Profile Backfill Utility
- Authentication Domain Types
- Beneficiary and Import Storage
- Persistent Notification Storage
- Theme and Toast Libraries
- Collapsible Components
- Dashboard Visual Mockup
- Financial Report Storage
- Reminder Settings Storage
- Optional React Peers
- Original Dashboard Proposal
- Atomic Invitation Design
- Overdue Notification History
- Aspect Ratio Components
- React Peer Dependencies
- Frontend Development Scripts
- Report Import Migration
- Node Runtime Requirements
- Command Menu Library
- Date Utility Library
- Carousel React Library
- Emotion Styling Library
- OTP Input Library
- Motion Animation Library
- Material Icon Library
- Radix Avatar Library
- Radix Context Menu
- Radix Dropdown Menu
- Radix Hover Card
- Radix Menubar Library
- Radix Radio Group
- Radix Scroll Area
- Radix Separator Library
- Radix Slider Library
- Radix Tabs Library
- Radix Toggle Library
- Radix Tooltip Library
- HTML5 Drag Backend
- React Popper Library
- Resizable Panel Library
- React Slick Library
- Tailwind Class Merge
- Tailwind Animation Library
- Vaul Drawer Library
- Package Workspace Configuration
- Component License Attribution
- Photo License Attribution
- Application HTML Shell

## God Nodes (most connected - your core abstractions)
1. `cn()` - 223 edges
2. `throwDb()` - 81 edges
3. `react` - 63 edges
4. `ApiError` - 58 edges
5. `apiRequest()` - 45 edges
6. `auditLog()` - 42 edges
7. `lucide-react` - 38 edges
8. `parseBody()` - 36 edges
9. `express` - 33 edges
10. `App()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `Account loading integration` --semantically_similar_to--> `Vercel Services backend routing`  [INFERRED] [semantically similar]
  README.md → docs/vercel-backend.md
- `UI HCI pull request checklist` --references--> `Project Tracker UI Rules`  [EXTRACTED]
  .github/PULL_REQUEST_TEMPLATE.md → frontend/guidelines/Guidelines.md
- `getReportImportReview()` --indirect_call--> `throwDb()`  [INFERRED]
  backend/src/controllers/reportImports.controller.ts → backend/src/utils/http.ts
- `runOverdueTaskNotifications()` --indirect_call--> `throwDb()`  [INFERRED]
  backend/src/services/overdueNotifications.service.ts → backend/src/utils/http.ts
- `progress_updates_project_idx` --indexes--> `public.progress_updates`  [EXTRACTED]
  backend/supabase/migrations/0002_multi_project.sql → backend/supabase/migrations/0001_init.sql

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Planned forecast safety controls** — docs_predictive_intelligence_governance, docs_predictive_intelligence_tenant_isolation, docs_predictive_intelligence_human_review [EXTRACTED 1.00]
- **Release verification layers** — docs_phase_0_stabilization_integration_tests, docs_phase_0_stabilization_hosted_staging, docs_phase_0_stabilization_release_gates [EXTRACTED 1.00]

## Communities (117 total, 49 thin omitted)

### Community 0 - "Spreadsheet Import Workflow"
Cohesion: 0.05
Nodes (57): submit(), chooseDate(), definedPayload(), displayMoney(), displayPercent(), DuplicateMode, existingActivityFor(), existingFinancialFor() (+49 more)

### Community 1 - "Shared Display Components"
Cohesion: 0.06
Nodes (41): AccordionContent(), AccordionItem(), AccordionTrigger(), Avatar(), AvatarFallback(), AvatarImage(), BreadcrumbEllipsis(), BreadcrumbItem() (+33 more)

### Community 2 - "Sidebar and Panel Components"
Cohesion: 0.07
Nodes (42): Input(), Separator(), Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+34 more)

### Community 3 - "Application Navigation and Authentication"
Cohesion: 0.07
Nodes (35): activityRouteFromPath(), App(), Challenges, DataEntry, demoMembership, getInitialTheme(), hasPasswordRecoveryToken(), ImportedDataReview (+27 more)

### Community 4 - "Imported Data Review"
Cohesion: 0.07
Nodes (45): clone(), colorOptions, currentRecordsImport(), emptyToNull(), Field(), ImportedActivity, ImportedChallenge, ImportedDataReview() (+37 more)

### Community 5 - "Spreadsheet Parsing"
Cohesion: 0.11
Nodes (44): sampleRows(), sheetNames, shifted(), cellText(), compact(), editDistance(), fieldAliases, FinancialPreview (+36 more)

### Community 6 - "Backend Middleware and Configuration"
Cohesion: 0.09
Nodes (29): app, env, result, schema, hasCronSecret(), runOverdueTaskNotificationsForCron(), auth(), errorHandler() (+21 more)

### Community 7 - "Interactive Input Components"
Cohesion: 0.07
Nodes (16): Checkbox(), HoverCardContent(), InputOTP(), InputOTPGroup(), InputOTPSlot(), PopoverContent(), RadioGroup(), RadioGroupItem() (+8 more)

### Community 8 - "Financial and Import Controllers"
Cohesion: 0.14
Nodes (23): supabase, createFinancialReport(), listFinancialReports(), normalizeReport(), createReportImport(), getImport(), getReportImportReview(), listReportImports() (+15 more)

### Community 9 - "Scheduled Reminder Delivery"
Cohesion: 0.08
Nodes (27): buildEmail(), completedStatuses, corsHeaders, emptyResult(), escapeHtml(), formatDate(), Frequency, frequencyDays (+19 more)

### Community 10 - "Product Plans and Verification"
Cohesion: 0.07
Nodes (24): UI HCI pull request checklist, Isolated hosted staging, HTTP integration fixtures, Phase 0 stabilization, Binary workbook import verification, Proposed prediction data contracts, Future Predictive Intelligence module, Planned isolated Python ML worker (+16 more)

### Community 11 - "Stabilization CI Workflow"
Cohesion: 0.07
Nodes (30): concurrency, cancel-in-progress, group, runs-on, steps, strategy, timeout-minutes, jobs (+22 more)

### Community 12 - "Frontend Component Dependencies"
Cohesion: 0.07
Nodes (30): dependencies, canvas-confetti@1.9.4, class-variance-authority@0.7.1, clsx@2.1.1, lucide-react@0.487.0, @radix-ui/react-accordion@1.2.3, @radix-ui/react-alert-dialog@1.1.6, @radix-ui/react-checkbox@1.1.4 (+22 more)

### Community 13 - "Dashboard Overview and Challenges"
Cohesion: 0.14
Nodes (22): Challenges(), ChallengesSkeleton(), Filter, formatDate(), EmptyState(), badge, emptySummary, Overview() (+14 more)

### Community 14 - "Progress Tracking Interface"
Cohesion: 0.13
Nodes (22): colors, ProgressSkeleton(), ProgressTracking(), canEditUpdate(), openUpdate(), ProgressTrackingProps, Command(), CommandDialog() (+14 more)

### Community 15 - "Project Settings and Membership"
Cohesion: 0.11
Nodes (28): getDraft(), initials(), isDraftChanged(), MemberCard(), MemberDraft, MembersSkeleton(), OverdueReminderHistoryItem, OverdueReminderResult (+20 more)

### Community 16 - "Challenge and Finance Operations"
Cohesion: 0.24
Nodes (22): createChallenge(), deleteChallenge(), listChallenges(), updateChallenge(), approveFinancialEntry(), createFinancialEntry(), decide(), deleteFinancialEntry() (+14 more)

### Community 17 - "Request Validation Schemas"
Cohesion: 0.07
Nodes (26): activitySchema, createChallengeSchema, createFinancialReportSchema, createFinancialSchema, createNotificationSchema, createProgressSchema, createProjectSchema, date (+18 more)

### Community 18 - "Core Database Schema"
Cohesion: 0.12
Nodes (25): activities_district_idx, activities_officer_idx, audit_user_created_idx, challenges_activity_idx, financial_activity_idx, financial_status_idx, progress_activity_idx, progress_officer_idx (+17 more)

### Community 19 - "Dialogs and Dropdowns"
Cohesion: 0.11
Nodes (19): AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay(), AlertDialogPortal() (+11 more)

### Community 20 - "Invitation Acceptance Workflow"
Cohesion: 0.17
Nodes (22): AcceptanceResult, acceptInvitation(), addDays(), assertUsableInvitation(), assertVisibleInvitation(), createProjectInvitation(), generateUniqueToken(), getInvitationByToken() (+14 more)

### Community 21 - "Frontend Package Configuration"
Cohesion: 0.08
Nodes (23): @emotion/react@11.14.0, @mui/material@7.3.5, @popperjs/core@2.11.8, @radix-ui/react-dialog@1.1.6, @radix-ui/react-popover@1.1.6, @radix-ui/react-switch@1.1.3, react-day-picker@8.10.1, react-dnd@16.0.1 (+15 more)

### Community 22 - "Project Data Entry"
Cohesion: 0.19
Nodes (21): blank, DataEntry(), EntryFormSkeleton(), Tab, today, Context, DatasetState, FinancialReport (+13 more)

### Community 23 - "Backend Package Configuration"
Cohesion: 0.14
Nodes (19): devDependencies, pino-pretty@^13.0.0, tsx@^4.20.0, @types/cors@^2.8.18, @types/express@^5.0.3, @types/node@^22.15.0, @types/pdfkit@^0.17.2, typescript@^5.8.0 (+11 more)

### Community 24 - "Profile and Membership Management"
Cohesion: 0.19
Nodes (17): addProjectMember(), getCurrentUser(), listProjectMembers(), removeProjectMember(), updateProjectMember(), createProfile(), deleteProfile(), listProfiles() (+9 more)

### Community 25 - "Project Summary and Presentation"
Cohesion: 0.23
Nodes (18): buildExecutiveSummary(), countByStatus(), createProject(), financialReportMetrics(), firstText(), getProject(), getProjectPresentation(), getProjectSummary() (+10 more)

### Community 26 - "Backend Integration Tests"
Cohesion: 0.12
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

### Community 30 - "Project Membership Database"
Cohesion: 0.20
Nodes (13): public.profiles, public.reports, progress_updates_project_idx, project_members_user_idx, projects_created_by_idx, public.is_org_admin(), public.project_members, public.project_role() (+5 more)

### Community 31 - "Menubar Components"
Cohesion: 0.12
Nodes (12): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarPortal(), MenubarRadioItem(), MenubarSeparator() (+4 more)

### Community 32 - "Form Field Components"
Cohesion: 0.18
Nodes (13): @radix-ui/react-label@2.1.2, FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue (+5 more)

### Community 33 - "Status and Toggle Components"
Cohesion: 0.17
Nodes (12): Alert(), AlertDescription(), AlertTitle(), alertVariants, Badge(), badgeVariants, ToggleGroup(), ToggleGroupContext (+4 more)

### Community 34 - "Context Menu Components"
Cohesion: 0.12
Nodes (9): ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut(), ContextMenuSubContent() (+1 more)

### Community 35 - "Notification Controller"
Cohesion: 0.36
Nodes (13): assertProjectAccess(), completedActivityStatuses, createNotification(), formatDueDate(), generateOverdueActivityNotifications(), getUnreadNotificationCount(), listNotifications(), markAllNotificationsRead() (+5 more)

### Community 36 - "Backend TypeScript Configuration"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule (+6 more)

### Community 37 - "Carousel Components"
Cohesion: 0.19
Nodes (14): Button(), Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext() (+6 more)

### Community 38 - "Invitation Interface and API"
Cohesion: 0.21
Nodes (10): AcceptedInvitationProject, AcceptInvitationResponse, InvitationDetails, InvitationPage(), acceptInvitation(), messageForError(), roleLabel, apiUrl (+2 more)

### Community 39 - "Vercel Deployment Configuration"
Cohesion: 0.13
Nodes (14): buildCommand, entrypoint, framework, installCommand, rewrites, root, crons, framework (+6 more)

### Community 40 - "API Route Composition"
Cohesion: 0.14
Nodes (13): activitiesRouter, membersRouter, usersRouter, challengesRouter, financialRouter, financialReportsRouter, apiRouter, invitationsRouter (+5 more)

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

### Community 46 - "Activity Detail Editor"
Cohesion: 0.27
Nodes (8): ActivityDraft, ActivityPage(), ActivityPageProps, formatDate(), formatText(), LoadingState(), normalizeStatus(), resolveOfficerName()

### Community 47 - "Activity CRUD Operations"
Cohesion: 0.36
Nodes (8): createActivity(), deleteActivity(), getActivity(), listActivities(), updateActivity(), createActivitySchema, updateActivitySchema, assertMemberOfProject()

### Community 48 - "Navigation Menu Components"
Cohesion: 0.24
Nodes (9): NavigationMenu(), NavigationMenuContent(), NavigationMenuIndicator(), NavigationMenuItem(), NavigationMenuLink(), NavigationMenuList(), NavigationMenuTrigger(), navigationMenuTriggerStyle (+1 more)

### Community 49 - "Project Presentation Interface"
Cohesion: 0.31
Nodes (7): Progress(), EmptyLine(), formatDate(), formatMoney(), MetricCard(), PresentationData, ProjectPresentation()

### Community 50 - "Excel and PDF Reports"
Cohesion: 0.28
Nodes (8): exceljs@^4.4.0, pdfkit@^0.17.1, buildExcel(), buildPdf(), display(), ReportData, exceljs, pdfkit

### Community 51 - "Invitation Database Functions"
Cohesion: 0.31
Nodes (5): project_invitations_created_by_idx, project_invitations_expires_idx, project_invitations_project_idx, public.project_invitations, public.accept_project_invitation()

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

### Community 57 - "Beneficiary and Import Storage"
Cohesion: 0.33
Nodes (5): beneficiaries_district_idx, public.beneficiaries, beneficiaries_project_idx, project_report_imports_project_idx, public.project_report_imports

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

### Community 67 - "Overdue Notification History"
Cohesion: 0.83
Nodes (3): overdue_task_notifications_lookup_idx, overdue_task_notifications_project_sent_idx, public.overdue_task_notifications

### Community 69 - "React Peer Dependencies"
Cohesion: 0.50
Nodes (4): peerDependencies, react@18.3.1, react-dom@18.3.1, react-dom

### Community 70 - "Frontend Development Scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, typecheck

## Knowledge Gaps
- **27 isolated node(s):** `./dist/app.js`, `Supabase authentication and persistence`, `Scheduled overdue reminders`, `Local demo mode`, `UI HCI pull request checklist` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 406 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Interactive Input Components` to `Spreadsheet Import Workflow`, `Shared Display Components`, `Sidebar and Panel Components`, `Application Navigation and Authentication`, `Imported Data Review`, `Dashboard Overview and Challenges`, `Progress Tracking Interface`, `Project Settings and Membership`, `Dialogs and Dropdowns`, `Frontend Package Configuration`, `Project Data Entry`, `Menubar Components`, `Form Field Components`, `Status and Toggle Components`, `Context Menu Components`, `Carousel Components`, `Invitation Interface and API`, `Chart Components`, `Drawer Components`, `Select Components`, `Activity Detail Editor`, `Navigation Menu Components`, `Project Presentation Interface`, `Project Switcher Memberships`, `React Peer Dependencies`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `throwDb()` (e.g. with `getReportImportReview()` and `runOverdueTaskNotifications()`) actually correct?**
  _`throwDb()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./dist/app.js`, `Supabase authentication and persistence`, `Scheduled overdue reminders` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Spreadsheet Import Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.053208137715179966 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `Shared Display Components` to `Form Field Components`, `Status and Toggle Components`, `Context Menu Components`, `Sidebar and Panel Components`, `Carousel Components`, `Interactive Input Components`, `Chart Components`, `Drawer Components`, `Select Components`, `Progress Tracking Interface`, `Dashboard Overview and Challenges`, `Navigation Menu Components`, `Project Presentation Interface`, `Dialogs and Dropdowns`, `Menubar Components`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Should `Shared Display Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06168831168831169 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Dashboard Overview and Challenges` to `Spreadsheet Import Workflow`, `Shared Display Components`, `Sidebar and Panel Components`, `Application Navigation and Authentication`, `Imported Data Review`, `Interactive Input Components`, `Frontend Component Dependencies`, `Progress Tracking Interface`, `Project Settings and Membership`, `Dialogs and Dropdowns`, `Frontend Package Configuration`, `Project Data Entry`, `Menubar Components`, `Context Menu Components`, `Carousel Components`, `Invitation Interface and API`, `Select Components`, `Activity Detail Editor`, `Navigation Menu Components`, `Project Presentation Interface`, `Project Switcher Memberships`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
## Run limitations

Semantic extraction ran in host agents; agent token usage was not exposed by the collaboration tools. Token counters of 0 are placeholders, not measured zero usage. No paid semantic API was invoked.

Nine code files yielded no modeled symbols, including five SQL migrations (0004, 0005, 0017, 0019, 0025) and backend/tests/validation.test.mjs, frontend/postcss.config.mjs, frontend/src/lib/apiResponse.test.ts, frontend/src/main.tsx.

graphify-out/ was written into the working tree and currently appears in git status; commit the outputs your team should share or add it to .gitignore.

Graph health warning: 2 dangling-endpoint edges and 134 collapsed undirected edges (133 in directed comparison). Distinct relations between the same endpoints may be lost in this simple graph.
