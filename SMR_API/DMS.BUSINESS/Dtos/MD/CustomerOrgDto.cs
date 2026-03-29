using AutoMapper;
using Common;
using DMS.CORE.Entities.MD.Attributes;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Dtos.MD
{
    public class CustomerOrgDto : BaseMdDto, IMapFrom, IDto
    {

        [Key]
        public string? Id { get; set; }
        [Required]
        public string CustomerCode { get; set; }
        [Required]
        public string OrgCode { get; set; }
       

        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblMdCustomerOrg, CustomerOrgDto>().ReverseMap();
        }
    }
}
