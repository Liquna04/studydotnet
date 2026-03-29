using AutoMapper;
using Common;
using DMS.CORE.Entities.AD;
using Microsoft.AspNetCore.Routing.Constraints;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DMS.BUSINESS.Dtos.AD
{
    public class AccountCustomerDto : BaseMdDto, IMapFrom, IDto
    {
        [Key]
        public string Id { get; set; }
        public string? CustomerCode { get; set; }
        public string? UserName { get; set; }

        public void Mapping(Profile profile)
        {
            profile.CreateMap<AccountCustomerDto, TblAdAccountCustomer>().ReverseMap();

        }
    }


}
