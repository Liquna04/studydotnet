using AutoMapper;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.MD;
using DMS.CORE;
using DMS.CORE.Entities.MD;
using DocumentFormat.OpenXml.Office2010.Excel;
using Microsoft.EntityFrameworkCore;
using NPOI.SS.Formula.Functions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Services.MD
{
    public interface ITransportUnitService : IGenericService<TblMdTransportUnit, TransportUnitDto>
    {
        Task<IList<TransportUnitDto>> GetAll(BaseMdFilter filter);





    }
    public class TransportUnitService(AppDbContext dbContext, IMapper mapper) : GenericService<TblMdTransportUnit, TransportUnitDto>(dbContext, mapper), ITransportUnitService
    {
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdTransportUnit.AsQueryable();
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


        public async Task<IList<TransportUnitDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdTransportUnit.AsQueryable();
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

        public override async Task<TransportUnitDto> Add(IDto data)
        {
            try
            {
                var Dto = data as TransportUnitDto;
                if (Dto == null)
                    throw new Exception("Dữ liệu không hợp lệ");
                Dto.Id = Guid.NewGuid().ToString();

                if (string.IsNullOrWhiteSpace(Dto.Code) ||
                    string.IsNullOrWhiteSpace(Dto.Name)
                    )
                    throw new ArgumentException("Không được để trống thông tin");

                bool exists = await _dbContext.TblMdTransportUnit
                    .AnyAsync(x => x.Code == Dto.Code);

                if (exists)
                    throw new Exception("Mã đơn vị vận tải đã tồn tại");

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

        public override async Task<TransportUnitDto> Update(IDto data)
        {
            try
            {
                if (data is not TransportUnitDto Dto)
                    throw new Exception("Dữ liệu không hợp lệ");

                // ✅ Validate Id
                if (string.IsNullOrWhiteSpace(Dto.Id))
                    throw new Exception("Id không được để trống");

                // ✅ Tìm entity theo Id
                var entity = await _dbContext.TblMdTransportUnit
                    .FirstOrDefaultAsync(x => x.Id == Dto.Id);

                if (entity == null)
                    throw new InvalidOperationException("Bản ghi không tồn tại");

                // ✅ Validate dữ liệu
                if (string.IsNullOrWhiteSpace(Dto.Code) ||
                      string.IsNullOrWhiteSpace(Dto.Name)
                      )
                    throw new Exception("Không được để trống thông tin");

                // ✅ Check trùng Code (loại trừ chính mình)
                bool exists = await _dbContext.TblMdTransportUnit
                    .AnyAsync(x => x.Code == Dto.Code && x.Id != Dto.Id);

                if (exists)
                    throw new InvalidOperationException("Mã đơn vị vận tải đã tồn tại");

                _mapper.Map(Dto, entity);

                _dbContext.TblMdTransportUnit.Update(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<TransportUnitDto>(entity);
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
