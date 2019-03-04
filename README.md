# aiXcoder plugin beta

This is a beta version of aiXcoder plugin. This plugin shows auto-generated code suggestions using latest AI technologies.

WARNING: This is a beta version. Many features are currently under development.

## Features

1. Make sure you have internet access.
2. If you need to use proxy, configure it in VSCode configurations (ctrl+, and search "proxy").
3. Open or create a file, type "impo" and pause.
4. You should see suggestions appear momentarily.
5. Use "tab" to advance.

## Configurations

```java
{
  // The delay in milliseconds before sending requests.
  "aiXcoder.delay": 3000,

  // Specifies the endpoint for code suggestion server.
  "aiXcoder.endpoint": "http://www.nnthink.com:8787/predict",

  // Default programming language, one of ["java", "python", "cpp"].
  "aiXcoder.language": "java"
}
```

**Enjoy!**
