using Gofabackend.DTO;
using Gofabackend.Models;

namespace Gofabackend.Services.Interfaces
{
    public interface IMaintenanceRequestService
    {
        Task<IEnumerable<MaintenanceRequestRegister>> GetAllAsync();
        Task<IEnumerable<MaintenanceRequestRegister>> GetByRequestedToAsync(string requestedTo);
        Task<MaintenanceRequestRegister?> UpdateStatusAsync(UpdateMaintenanceStatusDto dto); // updated return type
    }
}
