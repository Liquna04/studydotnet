using AutoMapper;
using AutoMapper.QueryableExtensions;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.MD;
using DMS.CORE;
using DMS.CORE.Entities.MD;
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
    public interface IUnLoadPointService : IGenericService<TblMdUnLoadPoint, UnLoadPointDto>
    {
        Task<IList<UnLoadPointDto>> GetAll(BaseMdFilter filter);

        Task<List<UnLoadPointDto>> ImportExcel(IFormFile file);
        Task<UnLoadPointCreateUpdateDto> AddCustom(UnLoadPointCreateUpdateDto data);
        Task UpdateCustom(UnLoadPointCreateUpdateDto data);        //Task CreateInfo(UnLoadPointDto data);
        Task DeleteInfo(string id);
    }
    public class UnLoadPointService(AppDbContext dbContext, IMapper mapper) : GenericService<TblMdUnLoadPoint, UnLoadPointDto>(dbContext, mapper), IUnLoadPointService
    {
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdUnLoadPoint.Include(p => p.Customer).AsQueryable();
                if (!string.IsNullOrWhiteSpace(filter.KeyWord))
                {
                    query = query.Where(x => x.Code.ToString().Contains(filter.KeyWord) || x.Name.Contains(filter.KeyWord));
                }
                if (filter.IsActive.HasValue)
                {
                    query = query.Where(x => x.IsActive == filter.IsActive);
                }
                query = query.OrderByDescending(x => x.CreateDate);
                var projectedQuery = query.ProjectTo<UnLoadPointDto>(_mapper.ConfigurationProvider);
                return await Paging(query, filter);

            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }


        public async Task<IList<UnLoadPointDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdUnLoadPoint.Include(p => p.Customer).AsQueryable();
                if (filter.IsActive.HasValue)
                {
                    query = query.Where(x => x.IsActive == filter.IsActive);
                }
                var result = await query
                         .OrderByDescending(x => x.CreateDate)
                         .ProjectTo<UnLoadPointDto>(_mapper.ConfigurationProvider)
                         .ToListAsync();
                Status = true;
                return result;
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
      
        public async Task DeleteInfo(string id)
        {
            try
            {
                var entity = await _dbContext.TblMdUnLoadPoint.FindAsync(id);
                if (entity != null)
                {
                    _dbContext.TblMdUnLoadPoint.Remove(entity);
                    await _dbContext.SaveChangesAsync();
                }

            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
            }
        }
        public async Task<List<UnLoadPointDto>> ImportExcel(IFormFile file)
        {

            if (file == null || file.Length == 0)
            {
                // Nếu file rỗng thì ném exception hoặc trả null
                throw new ArgumentException("File rỗng");
            }


            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

            using var memStream = new MemoryStream();
            await file.CopyToAsync(memStream);
            memStream.Position = 0;


            using var package = new ExcelPackage(memStream);
            var worksheet = package.Workbook.Worksheets.FirstOrDefault();
            if (worksheet == null)
            {
                throw new Exception("Không tìm thấy sheet trong file Excel");
            }

            // 5. Xác định số dòng dữ liệu
            var rowCount = worksheet.Dimension.End.Row;

            // 6. Danh sách để chứa các bản ghi mới
            var newProducts = new List<TblMdUnLoadPoint>();

            // 7. Vòng lặp đọc từng dòng trong file Excel (bỏ dòng tiêu đề)
            for (int row = 2; row <= rowCount; row++) // giả sử dòng 1 là tiêu đề
            {
                // Đọc từng cột trong file Excel theo thứ tự
                var code = worksheet.Cells[row, 1].Text?.Trim(); // Cột A: Mã 
                var name = worksheet.Cells[row, 2].Text?.Trim(); // Cột B: Tên 
                var customerId = worksheet.Cells[row, 3].Text?.Trim(); // Cột C: Mã khách hàng

                // Nếu tất cả đều rỗng => bỏ qua dòng đó
                if (string.IsNullOrEmpty(code) && string.IsNullOrEmpty(name))
                {
                    continue;
                }
                // Kiểm tra xem sản phẩm đã tồn tại chưa (theo Code)
                var existingUnLoadPoint = await _dbContext.TblMdUnLoadPoint
                    .FirstOrDefaultAsync(x => x.Code == code);

                if (existingUnLoadPoint == null)
                {
                    this.Status = true;
                    var entity = new TblMdUnLoadPoint
                    {
                        ID = Guid.NewGuid().ToString(),
                        Code = code,
                        Name = name,
                        CustomerId = customerId,

                        IsActive = true, // mặc định active
                    };
                    newProducts.Add(entity);
                }
                else
                {
                    this.Status = false;
                    return null;
                    //throw new Exception($"Đã có đơn vị tồn tại trong hệ thống");
                }
            }

            // Thêm danh sách bản ghi mới vào DB
            if (newProducts.Any())
            {
                _dbContext.TblMdUnLoadPoint.AddRange(newProducts);
                await _dbContext.SaveChangesAsync();
            }
            var dtos = _mapper.Map<List<UnLoadPointDto>>(newProducts);

            return dtos;
        }
        public async Task<UnLoadPointCreateUpdateDto> AddCustom(UnLoadPointCreateUpdateDto data)
        {
            try
            {
                data.Id = Guid.NewGuid().ToString();

                if (string.IsNullOrWhiteSpace(data.Code) ||
                    string.IsNullOrWhiteSpace(data.Name)
                    )
                    throw new Exception("Không được để trống thông tin");

                bool exists = await _dbContext.TblMdUnLoadPoint.AnyAsync(x => x.Code == data.Code);
                if (exists)
                    throw new Exception("Mã điểm trả hàng đã tồn tại");

                var entity = _mapper.Map<TblMdUnLoadPoint>(data);
                await _dbContext.TblMdUnLoadPoint.AddAsync(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<UnLoadPointCreateUpdateDto>(entity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

        public async Task UpdateCustom(UnLoadPointCreateUpdateDto data)
        {
            try
            {
                var entity = await _dbContext.TblMdUnLoadPoint.FirstOrDefaultAsync(x => x.ID == data.Id);
                if (entity == null)
                    throw new Exception("Không tìm thấy bản ghi cần cập nhật");

                _mapper.Map(data, entity);
                _dbContext.TblMdUnLoadPoint.Update(entity);
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
            }
        }
    }

}
