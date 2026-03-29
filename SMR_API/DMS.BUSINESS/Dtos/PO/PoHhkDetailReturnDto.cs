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
    public class PoHhkDetailReturnDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
        public string Pkid { get; set; }

        public string HeaderCode { get; set; }

        public string MaterialCode { get; set; }

        public int? NumberItem { get; set; }

        public decimal? ReturnQuantity { get; set; }

        public decimal? ApproveQuantity { get; set; }

        public decimal? RealQuantity { get; set; }

        public string UnitCode { get; set; }
        public string BasicUnit { get; set; }
        public decimal? Price { get; set; }


        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblPoHhkDetailReturn, PoHhkDetailReturnDto>().ReverseMap();
        }
    }
}
