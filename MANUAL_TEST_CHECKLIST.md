# Manual Test Checklist (V3 Firebase + Inngest)

Use this checklist to verify all features work correctly after changes.

## Prerequisites

Before testing:
1. Start Inngest dev server: `npx inngest-cli@latest dev`
2. Start Vite dev server: `npm run dev`
3. Open browser at `http://localhost:5173/` (not `127.0.0.1`)
4. Open browser DevTools Console (Cmd+Option+I on Mac)

---

## Authentication

### Google Sign-in
- [ ] Click "Continue with Google" on login screen
- [ ] Google popup appears and allows account selection
- [ ] After sign-in, redirected to Dashboard
- [ ] User email shown in sidebar footer
- [ ] Sign out works and returns to login screen

### Email/Password Sign-in
- [ ] Click "Sign in with Email" tab
- [ ] Create new account with email/password
- [ ] Confirm account created (redirected to Dashboard)
- [ ] Sign out and sign back in with same credentials
- [ ] Verify data persists across sign-out/sign-in

### Auth Persistence
- [ ] Close browser tab, reopen at localhost:5173
- [ ] User remains signed in (no login screen)

---

## Watchlist

### Default Data
- [ ] First-time sign-in shows 3 default watchlist topics
- [ ] Topics have pre-filled descriptions and time ranges

### Add Topic
- [ ] Click "Add Objective" button
- [ ] Fill in Topic, Description, Time Range
- [ ] Click "Save" - topic appears in list
- [ ] Refresh page - topic persists

### Edit Topic
- [ ] Click edit icon on existing topic
- [ ] Modify fields and save
- [ ] Changes persist after refresh

### Delete Topic
- [ ] Expand topic card
- [ ] Click delete button
- [ ] Confirm deletion
- [ ] Topic removed from list
- [ ] Refresh - topic stays deleted

### Error Handling
- [ ] Disconnect internet, try to add topic
- [ ] Error toast appears
- [ ] Form data is preserved (not cleared)

---

## Media Sources

### Default Data
- [ ] First-time sign-in shows default media sources
- [ ] 6 sources active by default (marked with blue shields)

### Toggle Source
- [ ] Click inactive source card - becomes active (blue)
- [ ] Click active source card - becomes inactive (gray)
- [ ] Refresh page - toggle state persists
- [ ] No console errors during toggle

### Add Source
- [ ] Click "Add Source" button
- [ ] Fill in Name, Domain, Political Leaning, Description
- [ ] Click "Save Source"
- [ ] New source appears in grid with active state
- [ ] Refresh page - source persists

### Delete Source
- [ ] Click chevron to expand source card
- [ ] Click "Delete Source" button
- [ ] Confirm deletion
- [ ] Source removed from grid
- [ ] Refresh - source stays deleted

### Error Handling
- [ ] Disconnect internet, try to toggle source
- [ ] Error toast appears ("Failed to update source")
- [ ] Try to add source while offline
- [ ] Error toast appears, form data preserved

---

## Dashboard & Reports

### Run Monitoring
- [ ] Go to Dashboard
- [ ] Click "Run Monitoring" button
- [ ] Report cards appear with "Pending" status
- [ ] Status updates in real-time:
  - Pending → Translating → Searching → Analyzing → Done
- [ ] Final report shows markdown content

### Individual Report
- [ ] Click "Run Again" on completed report
- [ ] Status resets and processes again
- [ ] New report replaces old one

### Report Content
- [ ] Report includes Executive Summary
- [ ] Report includes Narratives by political leaning
- [ ] Report includes cited sources with URLs
- [ ] Source URLs are clickable and open in new tabs

### Save Report
- [ ] Click star/bookmark icon on report
- [ ] Report marked as saved
- [ ] Refresh page - saved state persists

### Copy Report
- [ ] Click "Copy Report" button
- [ ] Paste in text editor
- [ ] Verify markdown content and sources included

### Delete Report
- [ ] Click delete button on report
- [ ] Confirm deletion
- [ ] Report removed from dashboard
- [ ] Refresh - report stays deleted

---

## Toast Notifications

- [ ] Success toast on add source
- [ ] Success toast on add watchlist topic
- [ ] Error toast on failed operations
- [ ] Toasts appear bottom-right
- [ ] Toasts auto-dismiss after few seconds

---

## Loading States

### Sources Page
- [ ] Navigate to Sources
- [ ] If loading with no data: skeleton cards visible
- [ ] If loading with existing data: no skeleton (data shown)
- [ ] No empty gray tiles when data loads

### Watchlist Page
- [ ] Navigate to Watchlist
- [ ] If loading with no data: skeleton visible
- [ ] If loading with existing data: no skeleton
- [ ] No empty fields at top when data loads

---

## Edge Cases

### Empty States
- [ ] Delete all watchlist topics
- [ ] Empty state message shown
- [ ] "Add your first objective" link works

- [ ] Delete all sources
- [ ] Empty state message shown
- [ ] "Add your first source" link works

### Network Errors
- [ ] Disable network in DevTools
- [ ] Try various operations
- [ ] Appropriate error toasts shown
- [ ] No silent failures

### Concurrent Users
- [ ] Sign in on two browser tabs
- [ ] Make change in one tab
- [ ] Other tab receives update via Firestore subscription

---

## Inngest Integration

### Check Inngest Dev Server
- [ ] Open http://localhost:8288 (Inngest dashboard)
- [ ] Verify app registered with functions

### Monitor Job Execution
- [ ] Run monitoring from Dashboard
- [ ] Check Inngest dashboard for job
- [ ] Job shows steps: translate → search → analyze
- [ ] Job completes successfully

### Job Failure Handling
- [ ] (If testable) Force job failure
- [ ] Report shows "error" status
- [ ] Error message displayed in UI

---

## Console Checks

Throughout testing, verify:
- [ ] No Firestore permission errors
- [ ] No uncaught promise rejections
- [ ] No React warnings
- [ ] No 401/403 errors

---

## Final Verification

- [ ] All user data persists across page refresh
- [ ] All user data persists across sign-out/sign-in
- [ ] Different users see different data
- [ ] App functions correctly after 15+ minutes idle

---

## Test Environment Cleanup

After testing:
1. Consider deleting test data from Firestore
2. Or keep test user for future testing
3. Stop dev servers when done
