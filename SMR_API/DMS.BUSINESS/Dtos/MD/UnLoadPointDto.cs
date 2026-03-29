using AutoMapper;
using Common;
using DMS.CORE.Entities.MD;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Dtos.MD
{
    public class UnLoadPointDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
        public string Id { get; set; }
        
        [Required]
        public string CustomerId { get; set; }
        [Required]
        public string Name { get; set; }
        [Required]
        public string Code { get; set; }

        public string? CustomerName { get; set; }

        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblMdUnLoadPoint, UnLoadPointDto>()
                  .ForMember(dest => dest.CustomerName,
                             opt => opt.MapFrom(src => src.Customer.FullName))
                  .ReverseMap();
        }
    }
    public class UnLoadPointCreateUpdateDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
        public string Id { get; set; }

        [Required]
        public string CustomerId { get; set; }
        [Required]
        public string Name { get; set; }
        [Required]
        public string Code { get; set; }

        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblMdUnLoadPoint, UnLoadPointCreateUpdateDto>().ReverseMap();
        }
    }
}
