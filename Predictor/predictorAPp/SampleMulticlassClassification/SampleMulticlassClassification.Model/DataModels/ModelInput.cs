//*****************************************************************************************
//*                                                                                       *
//* This is an auto-generated file by Microsoft ML.NET CLI (Command-Line Interface) tool. *
//*                                                                                       *
//*****************************************************************************************

using Microsoft.ML.Data;

namespace SampleMulticlassClassification.Model.DataModels
{
    public class ModelInput
    {
        [ColumnName("operation"), LoadColumn(0)]
        public string Operation { get; set; }


        [ColumnName("path"), LoadColumn(1)]
        public string Path { get; set; }


        [ColumnName("request"), LoadColumn(2)]
        public string Request { get; set; }


        [ColumnName("response"), LoadColumn(3)]
        public string Response { get; set; }


        [ColumnName("description"), LoadColumn(4)]
        public string Description { get; set; }


    }
}
