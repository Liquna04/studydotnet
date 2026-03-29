using AutoMapper;
using Common;
using DMS.CORE.Entities.MD;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DMS.BUSINESS.Dtos.MD
{
    public class RoomDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
        public string Id { get; set; }
        [Required]
        public string Name { get; set; }
        public string? Address { get; set; }
        public string? Note { get; set; }
        public decimal? Cols { get; set; }
        public decimal? Rows { get; set; }
        public string? FilePath { get; set; }
        public List<TblMdRoomDevice> ListDevice { get; set; } = new List<TblMdRoomDevice>();

        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblMdRoom, RoomDto>().ReverseMap();
        }
    }
}
