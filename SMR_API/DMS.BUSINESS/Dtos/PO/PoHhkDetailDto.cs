using AutoMapper;
using Common;
using DMS.CORE.Entities.PO.Attribute;
using System.ComponentModel.DataAnnotations;

namespace DMS.BUSINESS.Dtos.PO
{
    public class PoHhkDetailDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
        public string Pkid { get; set; }

        [Required]
        public string HeaderCode { get; set; }

        public string MaterialCode { get; set; }

        public int? NumberItem { get; set; }

        public decimal? Quantity { get; set; }

        public decimal? ApproveQuantity { get; set; }

        public decimal? RealQuantity { get; set; }

        public string UnitCode { get; set; }
        public string? BasicUnit { get; set; }
        public decimal? Price { get; set; }


        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblPoHhkDetail, PoHhkDetailDto>().ReverseMap();
        }
    }
}
