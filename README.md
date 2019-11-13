# aiXcoder Visual Studio Code Plugin for Java

AiXcoder is an code suggestions generator using the latest AI technologies. Our model is trained on over 1 TB of open source code and served from your own computer.

Currently it runs on 64-bit Windows/Mac OS and Linux.

![writing Java code with aiXcoder](https://github.com/aixcoder-plugin/vscode-plugin/raw/master/images/java_example.gif)

## Features

1. Only support Java for now. More languages (C++/Python/JavaScript/TypeScript/Go/Php) on the way...
2. Completely works offline. Your code is safe in your hand.
3. Long completion result with length up to a full line.
4. Rearrange completion items in a likelyhood probability descending order.

## Troubleshooting

The local server is downloaded into &lt;home&gt;/aiXcoder/installer/localserver/current/server/. Removing the folder and then restart VSCode will force this plugin to re-download the service.

The service is started as two processes with name "aix-node(.exe)", you can safely kill them at any time. The plugin will automatically launch the service upon a completion event if not running.

**Enjoy!**
