using System;

using Microsoft.Python.LanguageServer.Extensions;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Python.Core;
using Microsoft.Python.LanguageServer.Extensibility;

namespace AiXCoder.PythonTools
{
    public sealed class LanguageServerExtensionProvider : ILanguageServerExtensionProvider
    {
        public Task<ILanguageServerExtension> CreateAsync(
            IServiceContainer server,
            IReadOnlyDictionary<string, object> properties,
            CancellationToken cancellationToken)
        {
            return Task.FromResult<ILanguageServerExtension>(new LanguageServerExtension(server, properties));
        }
    }
}
