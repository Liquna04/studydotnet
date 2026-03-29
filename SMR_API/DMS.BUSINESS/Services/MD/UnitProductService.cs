using AutoMapper;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.MD;
using DMS.CORE;
using DMS.CORE.Entities.MD;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Services.MD
{
    public interface IUnitProductService : IGenericService<TblMdUnitProduct, UnitProductDto>
    {
        Task<IList<UnitProductDto>> GetAll(BaseMdFilter filter);

        Task<ImportResultUniProductDto> ImportExcel(IFormFile file);
        Task UpdateInfo(UnitProductDto data);
        //Task CreateInfo(UnitProductDto data);
        Task DeleteInfo(string id);
    }
    public class ImportResultUniProductDto
    {
        public List<UnitProductDto> Success { get; set; } = new();
        public List<string> Duplicates { get; set; } = new();
    }

    public class UnitProductService(AppDbContext dbContext, IMapper mapper) : GenericService<TblMdUnitProduct, UnitProductDto>(dbContext, mapper), IUnitProductService
    {
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdUnitProduct.AsQueryable();
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


        public async Task<IList<UnitProductDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdUnitProduct.AsQueryable();
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
        public async Task<ImportResultUniProductDto> ImportExcel(IFormFile file)
        {

            var duplicateCodeList = new List<string>();
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
            var expectedHeaders = new[] { "Mã đơn vị tính", "Tên đơn vị tính" }; // các cột hợp lệ
            var actualHeaders = new List<string>();

            for (int col = 1; col <= worksheet.Dimension.End.Column; col++)
            {
                var headerText = worksheet.Cells[1, col].Text?.Trim();
                if (!string.IsNullOrEmpty(headerText))
                {
                    actualHeaders.Add(headerText);
                }
            }

            // ✅ B2. So sánh danh sách cột
            var extraHeaders = actualHeaders.Except(expectedHeaders, StringComparer.OrdinalIgnoreCase).ToList();
            var missingHeaders = expectedHeaders.Except(actualHeaders, StringComparer.OrdinalIgnoreCase).ToList();

            if (extraHeaders.Any())
                throw new ArgumentException($"File Excel chứa cột không hợp lệ: {string.Join(", ", extraHeaders)}");

            if (missingHeaders.Any())
                throw new ArgumentException($"File Excel bị thiếu các cột: {string.Join(", ", missingHeaders)}");

            // 5. Xác định số dòng dữ liệu
            var rowCount = worksheet.Dimension.End.Row;

            // 6. Danh sách để chứa các bản ghi mới
            var newProducts = new List<TblMdUnitProduct>();

            // 7. Vòng lặp đọc từng dòng trong file Excel (bỏ dòng tiêu đề)
            for (int row = 2; row <= rowCount; row++) // giả sử dòng 1 là tiêu đề
            {
                // Đọc từng cột trong file Excel theo thứ tự
                var code = worksheet.Cells[row, 1].Text?.Trim(); // Cột A: Mã hàng hóa
                var name = worksheet.Cells[row, 2].Text?.Trim(); // Cột B: Tên hàng hóa
                if (code == "" ||
                        name == "")  
                {
                    var missingFields = new List<string>();
                    if (string.IsNullOrEmpty(code)) missingFields.Add("Code");
                    if (string.IsNullOrEmpty(name)) missingFields.Add("Name");

                    throw new ArgumentException($"Thiếu giá trị ở các cột: {string.Join(", ", missingFields)}");
                }

                // Nếu tất cả đều rỗng => bỏ qua dòng đó
                if (string.IsNullOrEmpty(code) && string.IsNullOrEmpty(name))
                {
                    continue;
                }
                // Kiểm tra xem sản phẩm đã tồn tại chưa (theo Code)
                var existingStorage = await _dbContext.TblMdUnitProduct
                    .FirstOrDefaultAsync(x => x.Code == code);

                if (existingStorage == null)
                {

                    var entity = new TblMdUnitProduct
                    {
                        Id = Guid.NewGuid().ToString(),
                        Code = code,
                        Name = name,

                        IsActive = true, // mặc định active
                    };
                    newProducts.Add(entity);
                }
                else
                {

                    // Nếu muốn update thì bạn map lại fields và gọi Update()
                    duplicateCodeList.Add(code);
                    throw new Exception($"Đã có đơn vị tồn tại trong hệ thống");
                    
                }
            }

            // Thêm danh sách bản ghi mới vào DB
            if (newProducts.Any())
            {
                _dbContext.TblMdUnitProduct.AddRange(newProducts);
                await _dbContext.SaveChangesAsync();
            }
            var success = _mapper.Map<List<UnitProductDto>>(newProducts);


            return new ImportResultUniProductDto
            {
                Success = success,
                Duplicates = duplicateCodeList

            };
        }
        //public async Task CreateInfo(UnitProductDto data)
        //{
        //    try
        //    {
        //        var code = Guid.NewGuid().ToString();

        //        data.ID = code;
        //        _dbContext.TblMdUnitProduct.Add(_mapper.Map<TblMdUnitProduct>(data));
        //        await _dbContext.SaveChangesAsync();
        //    }
        //    catch (Exception ex)
        //    {
        //        Status = false;
        //        Exception = ex;
        //    }
        //}
        public override async Task<UnitProductDto> Add(IDto data)
        {
            try
            {
                var Dto = data as UnitProductDto;
                if (Dto == null)
                    throw new Exception("Dữ liệu không hợp lệ");
                Dto.Id = Guid.NewGuid().ToString();

                // ✅ Validate
                if (string.IsNullOrWhiteSpace(Dto.Code) ||
                    string.IsNullOrWhiteSpace(Dto.Name)
                    )
                    throw new Exception("Không được để trống thông tin");

                bool exists = await _dbContext.TblMdUnitProduct
                    .AnyAsync(x => x.Code == Dto.Code);

                if (exists)
                    throw new Exception("Mã đơn vị tính đã tồn tại");

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
        public async Task UpdateInfo(UnitProductDto data)
        {
            try
            {

                _dbContext.TblMdUnitProduct.Update(_mapper.Map<TblMdUnitProduct>(data));

                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
            }
        }
        public async Task DeleteInfo(string id)
        {
            try
            {
                var entity = await _dbContext.TblMdUnitProduct.FindAsync(id);
                if (entity != null)
                {
                    _dbContext.TblMdUnitProduct.Remove(entity);
                    await _dbContext.SaveChangesAsync();
                }

            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
            }
        }

    }
}
