## [Unreleased] - 2023-06-25

### Added
- Added a mobile app built with Flutter that connects to the DoyinSoft web backend
- Implemented a WebView-based checkout and gift card purchase flow that integrates with the existing payment processing
- Added support for push notifications, which can be triggered for various in-app events like orders, gifts, and store launches
- Included features like a product catalog, stores directory, user accounts, orders, and wishlists that mirror the functionality of the web application

### Changed
- Restructured the project to include a dedicated `mobile` directory for the Flutter app
- Updated the README to document the mobile app architecture, setup, and features
- Moved some shared API helper functions from the web app to the new `lib/mobile/api.ts` file

### Fixed
- No fixes in this update

### Removed
- No removals in this update

---
<!-- pushpen-footer -->
Documentation automatically generated and kept up to date by [Pushpen](https://pushpen.dev).
