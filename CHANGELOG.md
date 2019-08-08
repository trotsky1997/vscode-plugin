# Change Log
All notable changes to the "aiXcoder" extension will be documented in this file.

## [0.1.10] -2019-08-08
### Added

### Changed

### Fixed
- 修复了一个未编码的用户id可能会导致请求失败的问题。
- (TS/JS)在预测结果的 = 和 { 之间加入了一个空格。
- 修复了奇怪的标签偶尔会出现的bug。

## [0.1.9] -2019-08-02
### Added

### Changed

### Fixed
- 修复了一个卸载aixcoder后原本的补全会出问题的bug。
- 修复了JS/TS中偶尔出现的结果显示不全的问题。
- 修复了相同结果重复出现的问题。

## [0.1.8] -2019-07-31
### Added
- 优化了JavaScript和TypeScript的支持（实验版本）。

### Changed

### Fixed

## [0.1.7] -2019-07-29
### Added
- 提供多个不同长度的结果，这个行为可以在设置页面中设置开关及出现的结果的数量和顺序。
- 新增JavaScript和TypeScript支持（实验版本）。

### Changed

### Fixed
- 修复了一个由于服务延迟导致的影响正常VS Code使用的问题。

## [0.1.6] - 2019-07-17
### Added

### Changed

### Fixed
- (C++)修复了一些会出现多余或缺失合理的空格的问题。

## [0.1.5] - 2019-07-16
### Added

### Changed

### Fixed
- (Java)修复了会出现重复的import的bug。

## [0.1.4] - 2019-07-02
### Added
- Now supports PHP. Works best with "intelliphense" extension.

### Changed
- Limit sort results with the same word to the most probable single result.

### Fixed
- A bug that sometimes writes the star in the code.
- Add a space after "for" and "while".
- Fixed compability with C/C++ Extension insider.

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
