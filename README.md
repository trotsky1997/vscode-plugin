# aiXcoder Visual Studio Code Plugin

AiXcoder is an code suggestions generator using the latest AI technologies. Our model is trained on over 1 TB of open source code and served from your own computer.

For now aiXcoder only supports Java/JavaScript/TypeScript/Python in offline mode.

Currently it runs on 64-bit Windows/Mac OS and Linux.

Java:

![writing Java code with aiXcoder](https://github.com/aixcoder-plugin/vscode-plugin/raw/master/images/java_example.gif)

## Requirements

1. VSCode 1.18+
2. [JRE 1.8+](https://adoptopenjdk.net/)
3. Around 500 MB of free memory.
4. More than 300 MB of free disk space in your home directory.

## Features

1. Only support Java/JavaScript/TypeScript/Python for now. More languages (C++/Go/Php) on the way...
2. Completely works offline. Your code is safe in your hand.
3. Long completion result with length up to a full line.
4. Rearrange completion items in a likelyhood probability descending order.

## Troubleshooting

The local server is downloaded into &lt;home&gt;/aiXcoder/installer/localserver/current/server/. Removing the folder and then restart VSCode will force this plugin to re-download the service.

The service is started as several processes including "aix-node(.exe)", you can safely kill them at any time. The plugin will automatically launch the service upon a completion event if not running.

**Enjoy!**
