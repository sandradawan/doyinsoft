## [Unreleased] - 2023-04-27

### Added
- Added a new mobile app for DoyinSoft built with Flutter, providing the same features as the web app
- Added REST API endpoints in `/api/mobile/*` to power the mobile app, including fetching product data, user orders, and device tokens for push notifications
- Added support for registering and unregistering device tokens for push notifications

### Changed
- Refactored the `/lib/mobile/api.ts` file to handle API requests from the mobile app, including validating Supabase access tokens and fetching vendor information
- Updated the README.md file to include information about the new mobile app, its architecture, and how to set it up and run it

### Fixed
- N/A

### Removed
- N/A

---
<!-- pushpen-footer -->
Documentation automatically generated and kept up to date by [Pushpen](https://pushpen.dev).
