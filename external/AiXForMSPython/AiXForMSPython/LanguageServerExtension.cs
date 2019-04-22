using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Python.Analysis;
using Microsoft.Python.Core;
using Microsoft.Python.Core.Logging;
using Microsoft.Python.Core.Text;
using Microsoft.Python.LanguageServer.Completion;
using Microsoft.Python.LanguageServer.Extensibility;
using Newtonsoft.Json;

namespace AiXCoder.PythonTools
{
    public sealed class LanguageServerExtension : ILanguageServerExtension, IDisposable, ICompletionExtension
    {
        private IServiceContainer server;
        private ILogger _log;
        private IServiceContainer services;
        private IPEndPoint localEndPoint;
        private Socket sender;
        private DateTime? lastTime = null;
        private bool debug;

        public LanguageServerExtension(IServiceContainer server, IReadOnlyDictionary<string, object> properties)
        {
            this.server = server;
            this._log = server.GetService<ILogger>();
            debug = (bool)properties["debug"];
            Log("AiXPython: LanguageServerExtension port=" + properties["port"]);
            try
            {
                int port = (int)(long)properties["port"];
                localEndPoint = new IPEndPoint(IPAddress.Loopback, port);
                sender = new Socket(IPAddress.Loopback.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
                sender.Connect(localEndPoint);
            }
            catch (Exception e)
            {
                Log("Error Init: " + e.Message);
            }
        }

        void Log(string s)
        {
            if (debug) return;
            var now = DateTime.Now;
            string timeDiff = string.Empty;
            if (lastTime.HasValue)
            {
                var msDiff = (now - lastTime.Value).TotalMilliseconds;
                if (msDiff < 5000)
                {
                    timeDiff = " 🕑: " + msDiff.ToString() + "ms";
                }
            }

            lastTime = now;
            _log.Log(TraceEventType.Information, "AiXPython: " + timeDiff + " " + s);
        }

        public string Name => "AiXPython";

        public void Dispose()
        {
            Log("AiXPython: Dispose");
        }

        public Task<IReadOnlyDictionary<string, object>> ExecuteCommand(string command, IReadOnlyDictionary<string, object> properties, CancellationToken token)
        {
            Log("AiXPython: ExecuteCommand: " + command);
            return null;
        }

        byte[] messageReceived = new byte[1024 * 100];
        public Task HandleCompletionAsync(IDocumentAnalysis analysis, SourceLocation location, CompletionItemEx[] completions, CancellationToken token)
        {
            Log("AiXPython: HandleCompletionAsync 2");
            try
            {
                var sortID = location.Column * location.Line;
                if (!sender.Connected)
                {
                    sender = new Socket(IPAddress.Loopback.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
                    sender.Connect(localEndPoint);
                }
                sender.Send(BitConverter.GetBytes(sortID));
                // Data buffer
                int byteRecv = sender.Receive(messageReceived);
                var recvStr = Encoding.UTF8.GetString(messageReceived, 0, byteRecv);
                Log("Message from Server -> " + recvStr);
                if (!string.IsNullOrEmpty(recvStr) && !recvStr.Equals("-"))
                {
                    SortResult sortResult = JsonConvert.DeserializeObject<SortResult>(recvStr);
                    int rank = 0;
                    foreach (var sortCompletion in sortResult.list)
                    {
                        foreach (var completion in completions)
                        {
                            if (completion.label.Equals(sortCompletion.word))
                            {
                                BuildPythiaCompletionItem(completion, rank++);
                                break;
                            }
                        }
                    }
                }
            }
            catch (Exception e)
            {
                Log("Error: " + e.Message);
                Log(e.StackTrace);
            }

            Log("AiXPython: HandleCompletionAsync ends");
            return Task.CompletedTask;
        }

        private static CompletionItemEx BuildPythiaCompletionItem(CompletionItemEx item, int rank)
        {
            if (string.IsNullOrEmpty(item.filterText))
                item.filterText = item.insertText;
            item.label = "⭐" + item.label;
            item.sortText = "0." + rank;
            return item;
        }

        public Task Initialize(IServiceContainer services, CancellationToken token)
        {
            Log("AiXPython: Initialize");
            this.services = services;
            return Task.CompletedTask;
        }
    }
}