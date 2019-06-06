using System;

namespace AiXCoder.PythonTools
{
    public class SortResult
    {
        public string queryUUID;
        public SingleWordCompletion[] list;
    }

    public class Rescue
    {
        public string type;
        public string value;
    }

    public class CompletionOptions
    {
        public Rescue[] rescues;
        public bool forced;
    }

    public class SingleWordCompletion
    {
        public string word;
        public double prob;
        public CompletionOptions options;
    }
}
