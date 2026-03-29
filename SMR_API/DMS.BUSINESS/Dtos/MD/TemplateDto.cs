using AutoMapper;
using Common;
using DMS.CORE.Entities.MD;
using Microsoft.AspNetCore.Routing.Constraints;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DMS.BUSINESS.Dtos.MD
{
    public class TemplateDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
        public string? Id { get; set; }
        public string? Name { get; set; }
        [Required]
        public string FileName { get; set; }
        [Required]
        public string FileType { get; set; }
        [Required]
        public string FilePath { get; set; }
        [Required]
        public string ThumbName { get; set; }
        public string? TempType { get; set; }
        [Required]
        public string ThumbPath { get; set; }
        public (byte[], string, string)? ThumbDetail { get; set; }
        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblMdTemplate, TemplateDto>().ReverseMap();
        }
    }


}
