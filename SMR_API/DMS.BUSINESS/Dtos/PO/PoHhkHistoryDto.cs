using AutoMapper;
using Common;
using DMS.CORE.Entities.PO;
using System.ComponentModel.DataAnnotations;

namespace DMS.BUSINESS.Dtos.PO
{
    public class PoHhkHistoryDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
        public string Pkid { get; set; }

        [Required]
        public string HeaderCode { get; set; }

        public string Status { get; set; }

        public string Notes { get; set; }

        public DateTime? StatusDate { get; set; }


        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblPoHhkHistory, PoHhkHistoryDto>().ReverseMap();
        }
    }
}
