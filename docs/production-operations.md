# Ravqen Production Operations

## Program Seeds

- Seeded Ravqen programs should be treated as `system` programs.
- System programs can be duplicated and edited into custom versions.
- System programs should not be archived or permanently deleted in normal operations.
- Custom programs should be used for gym-specific variants, experiments, and seasonal blocks.

## Program Statuses

- `active`: available for scheduling and member delivery.
- `archived`: retained for reference but should not be assigned into new rotations.
- `system`: seeded/core Ravqen programming.
- `custom`: gym-owned or operator-created programming.

## Backup Strategy

Use the in-app `Export snapshot` action before major library or calendar edits. That export should be treated as the fast operator backup.

For safer production operations, keep:

- a fresh export after every major programming pass
- a pre-launch export
- a weekly export of:
  - programs
  - calendar
  - internal exercise library

Recommended retention:

- latest daily snapshot for 7 days
- latest weekly snapshot for 8 weeks
- one pre-launch baseline snapshot

Production launch baseline:

- one snapshot immediately before the first paid member is onboarded
- one snapshot immediately after billing links, plans, and legal pages go live
- one snapshot before any major programming calendar refresh

## Restore Strategy

If a program, calendar slot, or library edit goes wrong:

1. identify the latest good JSON export
2. compare the affected program/library/calendar records
3. restore only the changed records where possible
4. re-save through the admin interface to revalidate the app

## Archived Content Handling

- archived programs should remain visible in the admin library for reference
- archived programs should not appear as the default working list for new scheduling
- archived exercises should remain searchable only if a future audit mode is added
- archived exercises should not appear in the normal picker flow

## Pre-Launch Checklist

- verify at least one active program exists in every intended training group
- verify the rotation calendar has no references to archived programs
- verify complimentary members route only to the `Complimentary` session
- verify system/core programs are protected
- verify exports open correctly and contain:
  - programs
  - calendar slots
  - date overrides
  - internal exercise library
- verify plans, support, privacy, and terms pages are publicly accessible
- verify support email and app URL environment variables are configured correctly
- verify payment links are set or that plans intentionally fall back to assisted/manual sales
