# aiXcoder Visual Studio Code Plugin

AiXcoder is a powerful code completer based on state-of-the-art deep learning technology. It can recommend the code that most likely to be typed during your coding process. aiXcoder also has the potential of recommending you a full line of code, which will help you coding faster.

![writing Java code with aiXcoder](https://github.com/aixcoder-plugin/vscode-plugin/raw/master/images/java_example.gif)

## Requirements

1. VSCode 1.18+
2. [JRE 1.8+](https://adoptopenjdk.net/)
3. Around 500 MB of free memory.
4. More than 300 MB of free disk space in your home directory.

## Features

1. Java is supported now. More languages (Python/JavaScript/TypeScript/C++) will be supported later.
2. Completely works offline. Your code is safe in your hand.
3. Long completion result with length up to a full line.
4. Rearrange completion items in a likelyhood probability descending order.

## Troubleshooting

1. AiXcoder will be launched automatically when you begin to type code.
2. When you start using aiXcoder on a new project, an indexing process is required to parse your code. This is necessary for aiXcoder to provide more accurate completions.
3. The service is running as several processes including "aix-node(.exe)". You can safely kill the process(es) at any time. The executables are located in &lt;home&gt;/aiXcoder/installer/localserver/current/server/. Removing the folder and then restart VSCode will force this plugin to re-download the service.

**Enjoy!**
