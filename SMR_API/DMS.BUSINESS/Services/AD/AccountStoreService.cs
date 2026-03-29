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
    public interface IAccountStoreService : IGenericService<TblAdAccountStore, AccountStoreDto>
    {
        Task<IList<AccountStoreDto>> GetAll(BaseMdFilter filter);
        Task<IList<AccountStoreDto>> GetByStoreCode(string storeCode);
        Task<IList<AccountStoreDto>> GetByUserName(string userName);

    }

    public class AccountStoreService(AppDbContext dbContext, IMapper mapper) : GenericService<TblAdAccountStore, AccountStoreDto>(dbContext, mapper), IAccountStoreService
    {
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblAdAccountStore.AsQueryable();
                if (!string.IsNullOrWhiteSpace(filter.KeyWord))
                {
                    query = query.Where(x => x.Id.ToString().Contains(filter.KeyWord) || x.StoreCode.Contains(filter.KeyWord));
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


        public async Task<IList<AccountStoreDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblAdAccountStore.AsQueryable();
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
        public override async Task<AccountStoreDto> Add(IDto data)
        {
            try
            {
                var Dto = data as AccountStoreDto;
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

        public override async Task<AccountStoreDto> Update(IDto data)
        {
            try
            {
                if (data is not AccountStoreDto Dto)
                    throw new ArgumentException("Dữ liệu không hợp lệ");

                // ✅ Validate Id
                if (string.IsNullOrWhiteSpace(Dto.Id))
                    throw new ArgumentException("Id không được để trống");

                // ✅ Tìm entity theo Id
                var entity = await _dbContext.TblAdAccountStore
                    .FirstOrDefaultAsync(x => x.Id == Dto.Id);

                if (entity == null)
                    throw new InvalidOperationException("Bản ghi không tồn tại");
                if (string.IsNullOrWhiteSpace(Dto.UserName))
                    throw new ArgumentException("Tên đăng nhập không được để trống");

                // ✅ Check trùng Code (loại trừ chính mình)
                bool exists = await _dbContext.TblAdAccountStore
                    .AnyAsync(x => x.UserName == Dto.UserName && x.Id != Dto.Id);

                if (exists)
                    throw new InvalidOperationException("Mã code đã tồn tại");

                _mapper.Map(Dto, entity);


                _dbContext.TblAdAccountStore.Update(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<AccountStoreDto>(entity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

        public async Task<IList<AccountStoreDto>> GetByStoreCode(string storeCode)
        {
            try
            {
                var query = _dbContext.Set<TblAdAccountStore>().AsQueryable();
                query = query.Where(x => x.IsActive == true && x.StoreCode == storeCode);
                var lstEntity = await query.ToListAsync();
                return _mapper.Map<List<AccountStoreDto>>(lstEntity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public async Task<IList<AccountStoreDto>> GetByUserName(string userName)
        {
            try
            {
                var query = _dbContext.Set<TblAdAccountStore>().AsQueryable();
                query = query.Where(x => x.IsActive == true && x.UserName == userName);
                var lstEntity = await query.ToListAsync();
                return _mapper.Map<List<AccountStoreDto>>(lstEntity);
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
