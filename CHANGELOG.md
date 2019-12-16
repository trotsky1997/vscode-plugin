# Change Log
All notable changes to the "aiXcoder" extension will be documented in this file.

## [0.3.10] - 

### Added
- Supports Python and JavaScript now with local service 1.2.0 or later.

### Fixed
- Fixes some bugs on starting local serivcee.

## [0.3.9] - 2019-12-11

### Added
- Automatically detects port of local service.

### Fixed
- Sometimes local service is not started properly.

## [0.3.7] - 2019-12-6

### Fixed
- Fix patch failures when file name contains underscore.
- Disable non-Java language hooking until local service is ready.

## [0.3.6] - 2019-12-5

### Added
- Display service index status.
- Asks if suggestions should be shown if index progress is not complete.
- Better performance on extremely long files (more than 800 lines) with server 1.1.1.

## [0.3.5] - 2019-12-2

### Added
- Periodically checks update.
- Incremental update.

## [0.3.4] - 2019-11-27

### Changed
- Better download/update experience.

## [0.3.3] - 2019-11-26

### Added
- Automatically trigger completion upon entering a completion. (Can be turned off in configurations)
- Configurable order of shorter results.

### Fixed
- Add a space between `catch` and `(`

## [0.3.2] - 2019-11-22

### Changed
- Wait longer on first request (server might be still loading workspace).

### Fixed
- Fix a workspace location related bug.

## [0.3.1] - 2019-11-22

### Added
- Now works better with project-scope completion.
- Sort results show probability as percentage.

### Changed
- Now predicts on dot even if intellicode is installed.

### Fixed
- Fix a bug that prevents local server launching automatically.
- Fix a bug when there is quote in comment.
- Fix updating failed because service is already running.
- (Mac) Fix an execute permission issue.
- (Java) Now predict on @

## [0.3.0] - 2019-11-18

### Added
- Progress display for launching local server.

### Changed

### Fixed

## [0.2.2] - 2019-11-18

### Added

### Changed
- Better error logs.

### Fixed
- No more annoying message about intellicode.
- Long result is now ranked in the first place

## [0.2.1] - 2019-11-14

### Added

### Changed

### Fixed
- Fix a plugin id mismatch bug.

## [0.2.0] - 2019-11-13

### Added
- First release of standalone aiXcoder local plugin.

### Changed

### Fixed
