using AutoMapper;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.AD;
using DMS.BUSINESS.Dtos.MD;
using DMS.CORE;
using DMS.CORE.Entities.AD;
using DMS.CORE.Entities.MD.Attributes;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace DMS.BUSINESS.Services.MD
{
    public interface ICustomerOrgService : IGenericService<TblMdCustomerOrg, CustomerOrgDto>
    {
        Task<IList<CustomerOrgDto>> GetAll(BaseMdFilter filter);
        Task<IList<CustomerOrgDto>> GetByOrgCode(string orgCode);
        Task<IList<CustomerOrgDto>> GetByCustomerCode(string customerCode);


    }
    public class CustomerOrgService(AppDbContext dbContext, IMapper mapper) : GenericService<TblMdCustomerOrg, CustomerOrgDto>(dbContext, mapper), ICustomerOrgService
    {
        public async Task<IList<CustomerOrgDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdCustomerOrg.AsQueryable();
                if (filter.IsActive.HasValue)
                {
                    query = query.Where(x => x.IsActive == filter.IsActive);
                }
                query = query.OrderByDescending(x => x.CreateDate);
                return await base.GetAllMd(query, filter);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdCustomerOrg.AsQueryable();
                if (!string.IsNullOrWhiteSpace(filter.KeyWord))
                {
                    query = query.Where(x => x.Id.ToString().Contains(filter.KeyWord) || x.OrgCode.Contains(filter.KeyWord));
                }
                if (filter.IsActive.HasValue)
                {
                    query = query.Where(x => x.IsActive == filter.IsActive);
                }
                return await Paging(query, filter);

            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public override async Task<CustomerOrgDto> Add(IDto data)
        {
            var Dto = data as CustomerOrgDto;
            if (Dto == null)
                throw new ArgumentException("Dữ liệu không hợp lệ");

            Dto.Id = Guid.NewGuid().ToString();

            // Validate
            if (string.IsNullOrWhiteSpace(Dto.CustomerCode) || string.IsNullOrWhiteSpace(Dto.OrgCode))
                throw new ArgumentException("Không được để trống thông tin");

            bool exists = await _dbContext.TblMdCustomerOrg
                .AnyAsync(x => x.CustomerCode == Dto.CustomerCode
                              && x.OrgCode == Dto.OrgCode
                              && x.Id != Dto.Id);

            if (exists)
                throw new ValidationException($"CustomerCode '{Dto.CustomerCode}' đã tồn tại với OrgCode '{Dto.OrgCode}'");

            // Gọi base
            return await base.Add(Dto);
        }
        public override async Task<CustomerOrgDto> Update(IDto data)
        {
            try
            {
                var errors = new List<string>();

                if (data is not CustomerOrgDto Dto)
                    throw new ArgumentException("Dữ liệu không hợp lệ");

                // ✅ Validate Id
                if (string.IsNullOrWhiteSpace(Dto.Id))
                    throw new ArgumentException("Không tìm được Id");

                // ✅ Tìm entity theo Id
                var entity = await _dbContext.TblMdCustomerOrg
                    .FirstOrDefaultAsync(x => x.Id == Dto.Id);

                if (entity == null)
                    throw new InvalidOperationException("Bản ghi không tồn tại");

                // ✅ Validate dữ liệu
                if (string.IsNullOrWhiteSpace(Dto.CustomerCode) || string.IsNullOrWhiteSpace(Dto.OrgCode))

                    throw new ArgumentException("Không được để trống thông tin");

                bool exists = await _dbContext.TblMdCustomerOrg
     .AnyAsync(x => x.CustomerCode == Dto.CustomerCode
                    && x.OrgCode == Dto.OrgCode
                    && x.Id != Dto.Id);

                if (exists)
                {
                    throw new ValidationException($"CustomerCode '{Dto.CustomerCode}' đã tồn tại với OrgCode '{Dto.OrgCode}'");
                }

                if (exists)
                    throw new InvalidOperationException("Mã code đã tồn tại");
                if (errors.Any())
                    throw new ArgumentException($"Dữ liệu không hợp lệ: {string.Join(", ", errors)}");
              


                _dbContext.TblMdCustomerOrg.Update(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<CustomerOrgDto>(entity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public async Task<IList<CustomerOrgDto>> GetByOrgCode(string orgCode)
        {
            try
            {
                var query = _dbContext.Set<TblMdCustomerOrg>().AsQueryable();
                query = query.Where(x =>  x.OrgCode == orgCode);
                var lstEntity = await query.ToListAsync();
                return _mapper.Map<List<CustomerOrgDto>>(lstEntity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public async Task<IList<CustomerOrgDto>> GetByCustomerCode(string customerCode)
        {
            try
            {
                var query = _dbContext.Set<TblMdCustomerOrg>().AsQueryable();
                query = query.Where(x =>x.CustomerCode == customerCode);
                var lstEntity = await query.ToListAsync();
                return _mapper.Map<List<CustomerOrgDto>>(lstEntity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
    }


}
