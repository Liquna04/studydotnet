using AutoMapper;
using Common;
using DMS.BUSINESS.Dtos.PO;
using DMS.CORE.Entities.MD;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DMS.BUSINESS.Dtos.MD
{
    public class ProductListDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
        public string? Id { get; set; }
        [Required]
        public string? Code { get; set; }
        [Required]
        public string? Name { get; set; }
        [Required]
        public string? Type { get; set; }
        [Required]
        public string? Unit { get; set; }
        public string? BasicUnit { get; set; }
        public decimal? Price { get; set; }
        public string? ProductTypeName { get; set; }
        public string? UnitProductName { get; set; }
        public string? BasicUnitProductName { get; set; }


        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblMdProductList, ProductListDto>()
       .ForMember(dest => dest.ProductTypeName,
                  opt => opt.MapFrom(src => src.ProductType.Name))
       .ForMember(dest => dest.UnitProductName,
                  opt => opt.MapFrom(src => src.UnitProduct.Name))
       .ForMember(dest => dest.BasicUnitProductName,
                  opt => opt.MapFrom(src => src.BasicUnitProduct.Name))

       .ReverseMap();
        }
        
    }
    public class ProductListCreateUpdateDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
        public string? Id { get; set; }
        [Required]
        public string? Code { get; set; }
        [Required]
        public string? Name { get; set; }
        [Required]
        public string? Type { get; set; }
        [Required]
        public string? Unit { get; set; }
        public string? BasicUnit { get; set; }
        public decimal? Price { get; set; }

        public void Mapping(Profile profile)
        {
            profile.CreateMap<ProductListCreateUpdateDto, TblMdProductList>().ReverseMap();
        }
    }


}
