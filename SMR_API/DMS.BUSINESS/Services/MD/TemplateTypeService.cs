using AutoMapper;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.MD;
using DMS.CORE;
using DMS.CORE.Entities.MD;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Services.MD
{
    public interface ITemplateTypeService : IGenericService<TblMdTemplateType, TemplateTypeDto>
    {
        Task<IList<TemplateTypeDto>> GetAll(BaseMdFilter filter);

    }
    public class TemplateTypeService(AppDbContext dbContext, IMapper mapper) : GenericService<TblMdTemplateType, TemplateTypeDto>(dbContext, mapper), ITemplateTypeService
    {
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdTemplateType.AsQueryable();
                if (!string.IsNullOrWhiteSpace(filter.KeyWord))
                {
                    query = query.Where(x => x.Id.ToString().Contains(filter.KeyWord) || x.Name.Contains(filter.KeyWord));
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


        public async Task<IList<TemplateTypeDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdTemplateType.AsQueryable();
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
        public override async Task<TemplateTypeDto> Add(IDto data)
        {
            try
            {
                var Dto = data as TemplateTypeDto;
                if (Dto == null)
                    throw new Exception("Dữ liệu không hợp lệ");
                Dto.Id = Guid.NewGuid().ToString();

                // ✅ Validate
               
                if (string.IsNullOrWhiteSpace(Dto.Name))
                    throw new Exception("Tên loại không được để trống");

                bool exists = await _dbContext.TblMdTemplateType
                    .AnyAsync(x => x.Id == Dto.Id);

                if (exists)
                    throw new Exception("Mã id đã tồn tại");

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

        public override async Task<TemplateTypeDto> Update(IDto data)
        {
            try
            {
                if (data is not TemplateTypeDto Dto)
                    throw new ArgumentException("Dữ liệu không hợp lệ");

                // ✅ Validate Id
                if (string.IsNullOrWhiteSpace(Dto.Id))
                    throw new ArgumentException("Id không được để trống");

                // ✅ Tìm entity theo Id
                var entity = await _dbContext.TblMdTemplateType
                    .FirstOrDefaultAsync(x => x.Id == Dto.Id);

                if (entity == null)
                    throw new InvalidOperationException("Bản ghi không tồn tại");

                // ✅ Validate dữ liệu
            
                if (string.IsNullOrWhiteSpace(Dto.Name))
                    throw new ArgumentException("Tên loại không được để trống");


                // ✅ Map DTO sang Entity (chỉ những field cần update)
                _mapper.Map(Dto, entity);


                _dbContext.TblMdTemplateType.Update(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<TemplateTypeDto>(entity);
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
