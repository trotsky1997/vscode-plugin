using System;

namespace AiXCoder.PythonTools
{
    public class SortResult
    {
        public string queryUUID;
        public SingleWordCompletion[] list;
    }

    public class SingleWordCompletion
    {
        public string word;
        public double prob;
    }
}
