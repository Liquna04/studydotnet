using AutoMapper;
using Common;
using DMS.CORE.Entities.MD;
using DMS.CORE.Entities.MD.Attributes;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Dtos.MD
{
    public class TransportVehicleDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
        public string? Id { get; set; }
        [Required]
        public string Code { get; set; }
        [Required]
        public string Name { get; set; }
        [Required]
        public string Type { get; set; }
        [Required]
        public string Capacity { get; set; }
        [Required]
        public string Driver { get; set; }
        public string? TransportTypeName { get; set; }

        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblMdTransportVehicle, TransportVehicleDto>()
       .ForMember(dest => dest.TransportTypeName,
                  opt => opt.MapFrom(src => src.TransportType.Name))
       .ReverseMap();
        }
    }
    public class TransportVehicleCreateUpdateDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
        public string? Id { get; set; }
        [Required]
        public string Code { get; set; }
        [Required]
        public string Name { get; set; }
        [Required]
        public string Type { get; set; }
        [Required]
        public string Capacity { get; set; }
        [Required]
        public string Driver { get; set; }


        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblMdTransportVehicle, TransportVehicleCreateUpdateDto>().ReverseMap();
        }
    }
}
