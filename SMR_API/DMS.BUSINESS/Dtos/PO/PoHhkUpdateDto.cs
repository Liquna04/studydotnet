using AutoMapper;
using Common;
using DMS.CORE.Entities.PO;
using System.ComponentModel.DataAnnotations;

namespace DMS.BUSINESS.Dtos.PO
{
    /// <summary>
    /// DTO for updating an existing PO order with details
    /// When updating an order:
    /// - T_PO_HHK header record is updated with new values (STATUS remains unchanged)
    /// - T_PO_HHK_DETAIL items are updated
    /// - T_PO_HHK_HISTORY gets a NEW record with STATUS = 0 ("Chỉnh sửa thông tin")
    /// </summary>
    public class PoHhkUpdateDto : IDto
    {
        // Header fields to update

        public string? PoType { get; set; }
        public decimal? TotalPrice { get; set; }
        public string? StoreCode { get; set; }
        public DateTime? ReceiptDate { get; set; }

        public string? TransportType { get; set; }
        public string? TransportMethod { get; set; }

        public string? VehicleCode { get; set; }

        public string? VehicleInfo { get; set; }

        public string? Driver { get; set; }

        public string? StorageCode { get; set; }

        public string? StorageName { get; set; }

        public string? Representative { get; set; }

        public string? Email { get; set; }

        public string? Phone { get; set; }

        public string? Note { get; set; }

        // Order items (detail records to update) - use existing PoHhkDetailItemDto
        public List<PoHhkDetailItemDto> Items { get; set; } = new List<PoHhkDetailItemDto>();
    }
}
