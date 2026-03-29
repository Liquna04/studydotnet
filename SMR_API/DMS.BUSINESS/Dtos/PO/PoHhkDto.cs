using AutoMapper;
using Common;
using DMS.CORE.Entities.PO.Attribute;
using System.ComponentModel.DataAnnotations;

namespace DMS.BUSINESS.Dtos.PO
{
    public class PoHhkDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
    
        public string Code { get; set; }
        public string? PoType { get; set; }
        public decimal? TotalPrice { get; set; }

        public string? CustomerCode { get; set; }

        public string? CustomerName { get; set; }

        public DateTime? OrderDate { get; set; }

        public DateTime? DeliveryDate { get; set; }

        public DateTime? ReceiptDate { get; set; }

        public string TransportType { get; set; }
        public string TransportMethod { get; set; }

        public string VehicleCode { get; set; }

        public string VehicleInfo { get; set; }

        public string Driver { get; set; }

        public string StorageCode { get; set; }

        public string StorageName { get; set; }

        public string Representative { get; set; }

        public string Email { get; set; }

        public string Phone { get; set; }

        public string Note { get; set; }

        public string Status { get; set; }
        public string? StoreCode { get; set; }
 

        public List<PoHhkDetailItemDto> Items { get; set; } = new List<PoHhkDetailItemDto>();

        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblPoHhk, PoHhkDto>().ReverseMap();
        }
    }
}
