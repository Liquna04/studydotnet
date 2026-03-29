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
    public class CustomerDto : BaseMdDto, IMapFrom, IDto
    {
       
        [Key]
        public string? Id { get; set; }
        public string? CustomerCode { get; set; }
        public string? FullName { get; set; }
        public string? ShortName { get; set; }
        public string? Address { get; set; }
        public string? VatNumber { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public bool? IsSendOnlyReject { get; set; }
        public string? GiaoCHXD { get; set; }


        public void Mapping(Profile profile)
        {
            profile.CreateMap<TblMdCustomer, CustomerDto>().ReverseMap();
        }
    }
}
