# AiXcoder Code Completer & Code Search Engine

AiXcoder is a code suggestions generator using the latest AI technologies. Our model is trained on over 1 TB of open source code and served from your own computer.

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

1. Java/JavaScript/TypeScript is supported now. More languages supports (Python/C++/PHP/Go) are on the way...
2. Completely works offline. Your code is safe in your hand.
3. Long completion result with length up to a full line.
4. Rearrange completion items in a likelyhood probability descending order.

## Troubleshooting

1. AiXcoder code completer will be launched automatically when you begin to type code.
2. When you start using aiXcoder on a new project, an indexing process is required for aiXcoder to parse your code. AiXcoder will provide more accurate completions after that.
3. The service is running as several processes, including "aix-node(.exe)". You can safely kill the process(es) at any time. The executables are located in &lt;home&gt;/aiXcoder/installer/localserver/current/server/. Removing the folder and then restart VSCode will force this plugin to re-download the service.

**Enjoy!**
