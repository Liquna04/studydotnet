using AutoMapper;
using Common;
using DMS.BUSINESS.Dtos.MD;
using DMS.CORE.Entities.MD;
using DMS.CORE.Entities.PO;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Dtos.PO
{
    public class PoHhkReturnDto : BaseMdDto, IMapFrom, IDto
    {

        [Key]
        public string Code { get; set; }
        public string? PoType { get; set; }
        public string? StoreCode { get; set; }
        public decimal? TotalPrice { get;set; }

        public string? OrderCode { get; set; }
        public string? CustomerCode { get; set; }

        public string? CustomerName { get; set; }

        public DateTime? OrderDate { get; set; }

        public DateTime? DeliveryDate { get; set; }

        public DateTime? ReceiptDate { get; set; }

        public string? TransportType { get; set; }

        public string? VehicleCode { get; set; }

        public string? Driver { get; set; }

        public string? TransportUnit { get; set; }

        public string? StorageCode { get; set; }

        public string? StorageName { get; set; }

        public string? Representative { get; set; }

        public string? Email { get; set; }

        public string? Phone { get; set; }

        public string? Note { get; set; }

        public string? Status { get; set; }
        public string? ReturnReason { get; set; }
        public DateTime? ReturnDate { get; set; }
        public string? ApprovedBy { get; set; }
        public DateTime? ApprovedDate { get; set; }
        public string? RejectReason { get; set; }
        public string? AttachmentPath { get; set; }

        public string? ReturnNote { get; set; }
        public DateTime? ExpectedReturnDate { get; set; }
        public List<PoHhkDetailReturnDto> PoHhkDetailReturn { get; set; }



        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblPoHhkReturn, PoHhkReturnDto>()
      .ForMember(dest => dest.PoHhkDetailReturn, opt => opt.MapFrom(src => src.PoHhkDetailReturn))
      .ReverseMap();
            profile.CreateMap<TblPoHhkDetailReturn, PoHhkDetailReturnDto>().ReverseMap();

        }
    }
}
