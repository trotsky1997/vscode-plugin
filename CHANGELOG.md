# Change Log
All notable changes to the "aiXcoder" extension will be documented in this file.

## [0.1.4] - %DATE%
### Added
- Now supports PHP. Works best with "intelliphense" extension.

### Changed

### Fixed
- A bug that sometimes writes the star in the code.

## [0.1.3] - 2019-06-27
### Added
- Added a configuration to set the prefered position of long results.

### Changed
- Delay C++ extension installation notice (until writing C++ code).

### Fixed
- Cpp: fixed an issue for enterprise users to select C++ models.
- Fix some spacing issues around comma and left parenthesis/bracket.
- Python: fixed an issue when sorting with Jedi engine.
- Python: fixed an issue when displaying suggested new varaible names with MS engine.
- Python: removed the space between try and comma.

## [0.1.2] - 2019-06-06
### Added
- Java: Automatically add missing class imports in completions.
- New feature to suggest variable names during variable/parameter definition.
- Added a configuration to turn off long results (sort only).

### Changed
- Use new telemetry API.

### Fixed
- Fixed sending wrong content because of chars.
- Fixed handling of Python docs.
- Fixed a bug that breaks sorting completions with mspython extension installed.

## [0.1.1] - 2019-05-24
### Added
- Configurations to turn off telemetry.
- A warning will show up if aixcoder.endpoint is empty.
- Java: Add brackets when using method type completions.
- Java: Rank completions with the same value adjancent to each other.
- A new configuration to supply additional parameters for advanced usages.
- A new configuration to config whether aiXcoder should always trigger or only on "Ctrl+Space".

### Changed
- A minor change to reduce network traffic.

### Fixed
- Fixed Java/C++ spacing issue around ++/-- operators.
- Fixed an infinite recursion issue when reporting error with telemetry turned off.
- Fixed an issue that slightly decreases the performance on Java.
- Fixed spacing around "<" and ">" on Java/C++.

## [0.1.0] - 2019-05-07
### Added
- First official release of aiXcoder for VS Code.
- Support C/C++. Install the [C/C++ Extension](vscode:extension/ms-vscode.cpptools) for the best experience.
