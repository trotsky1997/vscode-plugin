# AiXcoder Code Completer & Code Search Engine

AiXcoder is a powerful code completer & code serach engine based on state-of-the-art deep learning technology. It has the potential of recommending you a full line of code, which will help you code faster. AiXcoder also provides a code search engine to help you search for API use cases on GitHub.

![writing Java code with aiXcoder](https://github.com/aixcoder-plugin/vscode-plugin/raw/master/images/java_example.gif)

## Requirements

1. VSCode 1.18+
2. [JRE 1.8+](https://adoptopenjdk.net/)
3. Around 500 MB of free memory.
4. More than 300 MB of free disk space in your home directory.

## Features

1. Java is supported now. More languages supports (JavaScript/TypeScript/Python/C++/PHP/Go) are on the way...
2. Completely works offline. Your code is safe in your hand.
3. Long completion result with length up to a full line.
4. Rearrange completion items in a likelyhood probability descending order.

## Troubleshooting

1. AiXcoder code completer will be launched automatically when you begin to type code.
2. When you start using aiXcoder on a new project, an indexing process is required for aiXcoder to parse your code. AiXcoder will provide more accurate completions after that.
3. The service is running as several processes, including "aix-node(.exe)". You can safely kill the process(es) at any time. The executables are located in &lt;home&gt;/aiXcoder/installer/localserver/current/server/. Removing the folder and then restart VSCode will force this plugin to re-download the service.

**Enjoy!**
