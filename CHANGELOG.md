# Change Log
All notable changes to the "aiXcoder" extension will be documented in this file.

## [0.4.6] - 2020-01-13
### Changed
- A more robust and user-friendly update experience.

## [0.4.5] - 2020-01-09
### Changed
- Prompts to login if previously used online service.

## [0.4.4] - 2020-01-08
### Fixed
- Fixed an issue when writing inside string or comments.

## [0.4.3] - 2020-01-08
### Changed
- Does not download/update local service if the plugin is using online service.
- Prompts to switch to local service if already using online service.

### Fixed
- (JavaScript/TypeScript) A space before "}".
- No longer provide completions inside string or comments.

## [0.4.2] - 2020-01-06

### Added
- Supports new version file.
- (Go) Supports go extension 0.12.0.

### Fixed
- (JavaScript/TypeScript) Fixed a conflict when suggestions contain "hasOwnProperty".

## [0.4.1] - 2019-12-27

### Fixed
- Removed a deprecated "empty endpoint" warning.

## [0.4.0] - 2019-12-25

### Added
- Merged local service support.

### Fixed
- Fixed a URL concatenation issue.
- Fixed an issue when integrating with intellicode 1.2.2.

## [0.2.4] - 2019-12-17

### Changed
- 对IntelliCode有更好的兼容。
- 检查与本地版插件的冲突。

## [0.2.3] - 2019-12-13

### Fixed
- 修复了一个Win 7上的问题。

## [0.2.1] - 2019-11-28

### Added
- JavaScript/TypeScript/Go/Php的搜索。

## [0.2.0] - 2019-11-27

### Added
- 支持了专业版的自学习功能。

### Changed

### Fixed
- (JavaScript/TypeScript) `export`和`=`之间加上了空格。
- `switch`后加上了空格。
- 使用远程服务超时的提示文字写成了本地
- 修复了两个短结果相关的设置项无效的bug
- Fix a bug that prevents local server launching automatically.
- Fix a bug when there is quote in comment.
- (JavaScript/TypeScript) 一个vue中无法使用的bug。

## [0.1.19] - 2019-11-01

### Added
- 如果使用本地预测，并且本地预测服务没有启动，则自动在后台启动本地服务程序。

### Changed
- 优化了本地预测的结果。

### Fixed
- 修复了默认符号⭐显示为?的问题。
- 去掉了奇怪的`<UNK>`。
- (Python) `as`前面加上了空格。
- 修复了一个在没有配套插件的情况下不能使用的bug。
- (Java)去掉了<>()之间的空格。

## [0.1.18] - 2019-10-28

### Added
- 新增了搜索功能。在 Java/Python/C/C++ 代码里选中一部分文本，然后右键点击Search with aiXcoder...。
- 设置项有了中文显示。将VS Code默认显示语言改为中文简体时启用。
- 增加了对本地版服务的支持。
- 在网络服务不顺畅的时候，会合理地阻止网络调用以避免干扰正常使用。

### Changed
- Windows 7 及之前版本中，预测前面的符号默认为★。因为Emoji⭐会显示成方块。Mac不受影响。

### Fixed
- 去掉了@后面的多余的空格。
- 在未保存的c/c++文件中也有预测了。
- 修复了一个新版本intellicode导致的重复补全结果的bug。
- 修复了定义数组时[]附近的空格问题。

## [0.1.17] - 2019-09-27

### Added
### Changed
### Fixed
- 去掉了!后面的空格。
- (JavaScript/TypeScript)在=>前加上了空格。
- 修复了会出现奇怪的标签的bug
- 不会在字符串，注释里面发起提示了

## [0.1.16] - 2019-09-18

### Added
- 可以在设置里面修改预测前面的符号了，默认是⭐。
- 支持go语言。
- 增加了对新版本模型的支持。

### Changed
### Fixed
- 大小写混写的时候能正确地把概率高的结果排在前面了。
- 不会出现重复的短结果了。
- 一大堆空格相关的问题。
- 提醒安装语言对应的插件的提示不会持续弹出了。

## [0.1.15] - 2019-09-09

### Added
### Changed
- 优化了短结果的处理逻辑，现在响应速度应该会快了一些。

### Fixed
- 修复了一些情况下会把前一次的预测结果重复显示的问题。
- 修复了一个导致html里script标签下预测变差的问题。

## [0.1.14] - 2019-09-02
### Added
- 在Windows上安装到系统目录时发生权限问题时提示用户使用管理员权限重启。

### Changed

### Fixed
- 修复了HTML script标签内的预测没有短结果的问题。
- 修复了等号附近的空格问题。

## [0.1.13] - 2019-08-29
### Added

### Changed

### Fixed
- 修复了一个收集用户使用信息漏传信息类型的bug。
- 在数字和[之间加入了空格。
- (C++)修复了一个cirular json serialization的问题。
- 修复了弹出的消息窗口中按钮文本的格式错误。
- (Python)修复了Mac上使用Jedi引擎时无法提示的bug。
- 修复了导致无法在Mac上显示排序结果的bug。
- (JavaScript/TypeScript)HTML的script标签内也有预测了。

## [0.1.12] - 2019-08-20
### Added
- 更好的支持react语法。
- 支持了vue语法。

### Changed
- 更少出现"no suggestions"。

### Fixed
- 修复了if后面缺空格的问题。
- 修复了在连续快速输入的情况下，提示会慢甚至不出现的问题。
- 在字符串和数字前面加上了空格。

## [0.1.11] -2019-08-12
### Added

### Changed

### Fixed
- 修复了偶尔提示不会自动显示的bug。

## [0.1.10] -2019-08-11
### Added

### Changed

### Fixed
- 修复了一个未编码的用户id可能会导致请求失败的问题。
- (TS/JS)在预测结果的 = 和 { 之间加入了一个空格。
- (TS/JS)在预测结果的 ) 和 => 之间加入了一个空格。
- 修复了奇怪的标签偶尔会出现的bug。
- 修复了一个在 1.37.0 版本上出现的VSCode默认提示不会显示的问题。
- 更新了统计信息的接口。

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
