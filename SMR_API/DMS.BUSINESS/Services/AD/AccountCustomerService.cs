using AutoMapper;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.AD;
using DMS.CORE;
using DMS.CORE.Entities.AD;
using DocumentFormat.OpenXml.Office2010.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using NPOI.SS.Formula.Functions;
using OfficeOpenXml;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


namespace DMS.BUSINESS.Services.AD
{
    public interface IAccountCustomerService : IGenericService<TblAdAccountCustomer, AccountCustomerDto>
    {
        Task<IList<AccountCustomerDto>> GetAll(BaseMdFilter filter);
        Task<IList<AccountCustomerDto>> GetByCustomerCode(string customerCode);
        Task<IList<AccountCustomerDto>> GetByUserName(string userName);

    }

    public class AccountCustomerService(AppDbContext dbContext, IMapper mapper) : GenericService<TblAdAccountCustomer, AccountCustomerDto>(dbContext, mapper), IAccountCustomerService
    {
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblAdAccountCustomer.AsQueryable();
                if (!string.IsNullOrWhiteSpace(filter.KeyWord))
                {
                    query = query.Where(x => x.Id.ToString().Contains(filter.KeyWord) || x.CustomerCode.Contains(filter.KeyWord));
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


        public async Task<IList<AccountCustomerDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblAdAccountCustomer.AsQueryable();
                if (filter.IsActive.HasValue)
                {
                    query = query.Where(x => x.IsActive == filter.IsActive);
                }
                return await base.GetAllMd(query, filter);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public override async Task<AccountCustomerDto> Add(IDto data)
        {
            try
            {
                var Dto = data as AccountCustomerDto;
                if (Dto == null)
                    throw new Exception("Dữ liệu không hợp lệ");
                Dto.Id = Guid.NewGuid().ToString();
                if (string.IsNullOrWhiteSpace(Dto.UserName))
                    throw new Exception("Tên đăng nhập không được để trống");

             

                // ✅ Gọi base để lưu
                Status = true;
                return await base.Add(Dto);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

        public override async Task<AccountCustomerDto> Update(IDto data)
        {
            try
            {
                if (data is not AccountCustomerDto Dto)
                    throw new ArgumentException("Dữ liệu không hợp lệ");

                // ✅ Validate Id
                if (string.IsNullOrWhiteSpace(Dto.Id))
                    throw new ArgumentException("Id không được để trống");

                // ✅ Tìm entity theo Id
                var entity = await _dbContext.TblAdAccountCustomer
                    .FirstOrDefaultAsync(x => x.Id == Dto.Id);

                if (entity == null)
                    throw new InvalidOperationException("Bản ghi không tồn tại");
                if (string.IsNullOrWhiteSpace(Dto.UserName))
                    throw new ArgumentException("Tên đăng nhập không được để trống");

                // ✅ Check trùng Code (loại trừ chính mình)
                bool exists = await _dbContext.TblAdAccountCustomer
                    .AnyAsync(x => x.UserName == Dto.UserName && x.Id != Dto.Id);

                if (exists)
                    throw new InvalidOperationException("Mã code đã tồn tại");

                _mapper.Map(Dto, entity);


                _dbContext.TblAdAccountCustomer.Update(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<AccountCustomerDto>(entity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

        public async Task<IList<AccountCustomerDto>> GetByCustomerCode (string customerCode)
        {
            try
            {
                    var query = _dbContext.Set<TblAdAccountCustomer>().AsQueryable();
                    query = query.Where(x => x.IsActive == true && x.CustomerCode == customerCode);
                    var lstEntity = await query.ToListAsync();
                    return _mapper.Map<List<AccountCustomerDto>>(lstEntity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public async Task<IList<AccountCustomerDto>> GetByUserName(string userName)
        {
            try
            {
                var query = _dbContext.Set<TblAdAccountCustomer>().AsQueryable();
                query = query.Where(x => x.IsActive == true && x.UserName == userName);
                var lstEntity = await query.ToListAsync();
                return _mapper.Map<List<AccountCustomerDto>>(lstEntity);
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
