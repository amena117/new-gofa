namespace Gofabackend.Models.Constants
{
   
        public static class MaintenanceRequestStages
        {
            public const string Requested = "REQUESTED";
            public const string TeamLeaderApproved = "TEAM_LEADER_APPROVED";
            public const string ManagerApproved = "MANAGER_APPROVED";
            public const string MinistoreResponded = "MINISTORE_RESPONDED";
            public const string InRepair = "IN_REPAIR";
            public const string SentToQuality = "SENT_TO_QUALITY";
            public const string QualityApproved = "QUALITY_APPROVED";
            public const string ReturnedToPPC = "RETURNED_TO_PPC";
            public const string WaitingForSparePart = "WAITING_FOR_SPARE_PART";
        }
    

}
