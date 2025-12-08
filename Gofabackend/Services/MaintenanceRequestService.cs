// Services/MaintenanceRequestService.cs
using Gofabackend.Data;
using Gofabackend.DTO;
using Gofabackend.Models;
using Gofabackend.Models.Constants;
using Gofabackend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Gofabackend.Services
{
    public class MaintenanceRequestService : IMaintenanceRequestService
    {
        private readonly ApplicationDbContext _context;

        public MaintenanceRequestService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<MaintenanceRequestRegister>> GetAllAsync()
        {
            return await _context.MaintenanceRequestRegisters.ToListAsync();
        }

        public async Task<IEnumerable<MaintenanceRequestRegister>> GetByRequestedToAsync(string requestedTo)
        {
            return await _context.MaintenanceRequestRegisters
                .Where(m => m.RequestedTo != null && m.RequestedTo.ToLower() == requestedTo.ToLower())
                .ToListAsync();
        }

        public async Task<MaintenanceRequestRegister?> UpdateStatusAsync(UpdateMaintenanceStatusDto dto)
        {
            var request = await _context.MaintenanceRequestRegisters.FindAsync(dto.RequestId);
            if (request == null)
                return null;

            // Optional: Validate stage transition
            var validStatuses = new[]
            {
                MaintenanceRequestStages.Requested,
                MaintenanceRequestStages.TeamLeaderApproved,
                MaintenanceRequestStages.ManagerApproved,
                MaintenanceRequestStages.MinistoreResponded,
                MaintenanceRequestStages.InRepair,
                MaintenanceRequestStages.SentToQuality,
                MaintenanceRequestStages.QualityApproved,
                MaintenanceRequestStages.ReturnedToPPC
            };

            if (!validStatuses.Contains(dto.NewStatus))
                throw new InvalidOperationException("Invalid status update.");

            request.Status = dto.NewStatus;
            request.Approval = dto.UpdatedBy ?? request.Approval;
            request.Remark = dto.Remark ?? request.Remark;

            await _context.SaveChangesAsync();

            return request;
        }
    }
}
