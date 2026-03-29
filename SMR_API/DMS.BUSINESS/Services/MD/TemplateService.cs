using AutoMapper;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.MD;
using DMS.BUSINESS.Services.CM;
using DMS.CORE;
using DMS.CORE.Entities.MD;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Minio;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Services.MD
{
    public interface ITemplateService : IGenericService<TblMdTemplate, TemplateDto>
    {
        Task<IList<TemplateDto>> GetAll(BaseMdFilter filter);
        Task<List<TemplateDto>> MapFilePath(List<TemplateDto>? data);
    }
    public class TemplateService : GenericService<TblMdTemplate, TemplateDto>, ITemplateService
    {
        private readonly IConfiguration _configuration;
        private readonly IMinioClient _minioClient;

        public TemplateService(AppDbContext dbContext, IMapper mapper, IConfiguration configuration, IMinioClient minioClient) : base(dbContext, mapper)
        {
            _configuration = configuration;
            _minioClient = minioClient;
        }
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdTemplate.AsQueryable();
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


        public async Task<IList<TemplateDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdTemplate.AsQueryable();
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


        public async Task<List<TemplateDto>> MapFilePath(List<TemplateDto>? data)
        {

            try
            {
                foreach (var item in data)
                {
                    if (item.ThumbPath != null && item != null) 
                    {
                        
                    }
                };
                return data;
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public override async Task<TemplateDto> Add(IDto data)
        {
            try
            {
                var Dto = data as TemplateDto;
                if (Dto == null)
                    throw new Exception("Dữ liệu không hợp lệ");
                Dto.Id = Guid.NewGuid().ToString();

                // ✅ Validate
                if (string.IsNullOrWhiteSpace(Dto.FileName) || string.IsNullOrWhiteSpace(Dto.FilePath) || string.IsNullOrWhiteSpace(Dto.FileType)
                    || string.IsNullOrWhiteSpace(Dto.ThumbName) || string.IsNullOrWhiteSpace(Dto.ThumbPath))
                    throw new ArgumentException("Không được để trống thông tin");

                bool exists = await _dbContext.TblMdTemplate
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

        public override async Task<TemplateDto> Update(IDto data)
        {
            try
            {
                if (data is not TemplateDto Dto)
                    throw new ArgumentException("Dữ liệu không hợp lệ");

                // ✅ Validate Id
                if (string.IsNullOrWhiteSpace(Dto.Id))
                    throw new ArgumentException("Id không được để trống");

                // ✅ Tìm entity theo Id
                var entity = await _dbContext.TblMdTemplate
                    .FirstOrDefaultAsync(x => x.Id == Dto.Id);

                if (entity == null)
                    throw new InvalidOperationException("Bản ghi không tồn tại");

                // ✅ Validate dữ liệu
                if (string.IsNullOrWhiteSpace(Dto.FileName) || string.IsNullOrWhiteSpace(Dto.FilePath) || string.IsNullOrWhiteSpace(Dto.FileType)
               || string.IsNullOrWhiteSpace(Dto.ThumbName) || string.IsNullOrWhiteSpace(Dto.ThumbPath))
                    throw new ArgumentException("Không được để trống thông tin");



                // ✅ Map DTO sang Entity
                _mapper.Map(Dto, entity);


                _dbContext.TblMdTemplate.Update(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<TemplateDto>(entity);
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
