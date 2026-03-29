using AutoMapper;
using Common;
using DMS.CORE.Entities.PO;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Dtos.PO
{
    public class PoHhkHistoryReturnDto : BaseMdDto, IMapFrom, IDto
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
            profile.CreateMap<TblPoHhkHistoryReturn, PoHhkHistoryReturnDto>().ReverseMap();
        }
    }
}
