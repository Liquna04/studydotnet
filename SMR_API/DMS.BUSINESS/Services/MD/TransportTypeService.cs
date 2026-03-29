using AutoMapper;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.MD;
using DMS.CORE;
using DMS.CORE.Entities.MD;
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


namespace DMS.BUSINESS.Services.MD
{
    public interface ITransportTypeService : IGenericService<TblMdTransportType, TransportTypeDto>
    {
        Task<IList<TransportTypeDto>> GetAll(BaseMdFilter filter);
    }

    public class TransportTypeService(AppDbContext dbContext, IMapper mapper) : GenericService<TblMdTransportType, TransportTypeDto>(dbContext, mapper), ITransportTypeService
    {
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdTransportType.AsQueryable();
                if (!string.IsNullOrWhiteSpace(filter.KeyWord))
                {
                    query = query.Where(x => x.Code.ToString().Contains(filter.KeyWord) || x.Name.Contains(filter.KeyWord));
                }
                if (filter.IsActive.HasValue)
                {
                    query = query.Where(x => x.IsActive == filter.IsActive);
                }
                query = query.OrderByDescending(x => x.CreateDate);
                return await Paging(query, filter);

            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }


        public async Task<IList<TransportTypeDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdTransportType.AsQueryable();
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
        public override async Task<TransportTypeDto> Add(IDto data)
        {
            try
            {
                var Dto = data as TransportTypeDto;
                if (Dto == null)
                    throw new Exception("Dữ liệu không hợp lệ");
                Dto.Id = Guid.NewGuid().ToString();

                if (string.IsNullOrWhiteSpace(Dto.Code) ||
                    string.IsNullOrWhiteSpace(Dto.Name)
                    )
                    throw new ArgumentException("Không được để trống thông tin");

                bool exists = await _dbContext.TblMdTransportType
                    .AnyAsync(x => x.Code == Dto.Code);

                if (exists)
                    throw new Exception("Mã loại hình vận tải đã tồn tại");

                // ✅ Gọi base để lưu
                return await base.Add(Dto);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

        public override async Task<TransportTypeDto> Update(IDto data)
        {
            try
            {
                if (data is not TransportTypeDto Dto)
                    throw new Exception("Dữ liệu không hợp lệ");

                // ✅ Validate Id
                if (string.IsNullOrWhiteSpace(Dto.Id))
                    throw new Exception("Id không được để trống");

                // ✅ Tìm entity theo Id
                var entity = await _dbContext.TblMdTransportType
                    .FirstOrDefaultAsync(x => x.Id == Dto.Id);

                if (entity == null)
                    throw new InvalidOperationException("Bản ghi không tồn tại");

                if (string.IsNullOrWhiteSpace(Dto.Code) ||
                      string.IsNullOrWhiteSpace(Dto.Name)
                      )
                    throw new Exception("Không được để trống thông tin");

                // ✅ Check trùng Code (loại trừ chính mình)
                bool exists = await _dbContext.TblMdTransportType
                    .AnyAsync(x => x.Code == Dto.Code && x.Id != Dto.Id);

                if (exists)
                    throw new InvalidOperationException("Mã loại hình vận tải đã tồn tại");

                _mapper.Map(Dto, entity);


                _dbContext.TblMdTransportType.Update(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<TransportTypeDto>(entity);
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
