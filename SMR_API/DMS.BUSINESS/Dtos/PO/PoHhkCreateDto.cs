using AutoMapper;
using Common;
using DMS.BUSINESS.Dtos.MD;
using DMS.CORE.Entities.MD.Attributes;
using DMS.CORE.Entities.PO.Attribute;
using System.ComponentModel.DataAnnotations;

namespace DMS.BUSINESS.Dtos.PO
{
    /// <summary>
    /// DTO for creating a new PO order with details and initial history
    /// </summary>
    public class PoHhkCreateDto : IDto
    {
        // Header fields
        public string? Code { get; set; }
        public string? PoType { get; set; }
        public decimal? TotalPrice { get; set; }

        public string? CustomerCode { get; set; }

        public string? CustomerName { get; set; }

        public DateTime? OrderDate { get; set; }

        public DateTime? DeliveryDate { get; set; }

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
    public string? StoreCode { get; set; }

        // Order items (detail records)
        public  List<PoHhkDetailItemDto> Items { get; set; } = new List<PoHhkDetailItemDto>();

        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblPoHhk, PoHhkCreateDto>().ReverseMap();
        }
    }

    /// <summary>
    /// DTO for individual order detail item
    /// </summary>
    public class PoHhkDetailItemDto
    {
        [Required]
        public string MaterialCode { get; set; }

        public int? NumberItem { get; set; }

        [Required]
        public decimal Quantity { get; set; }
        public decimal? ApproveQuantity { get; set; }

        [Required]
        public string UnitCode { get; set; }
        public string BasicUnit { get; set; }
        public decimal? Price { get; set; }
    }
}
