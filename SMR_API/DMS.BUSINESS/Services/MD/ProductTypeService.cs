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
    public interface IProductTypeService : IGenericService<TblMdProductType, ProductTypeDto>
    {
        Task<IList<ProductTypeDto>> GetAll(BaseMdFilter filter);
        Task<List<ProductTypeDto>> ImportExcel(IFormFile file);
    }

    public class ProductTypeService(AppDbContext dbContext, IMapper mapper) : GenericService<TblMdProductType, ProductTypeDto>(dbContext, mapper), IProductTypeService
    {
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdProductType.AsQueryable();
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


        public async Task<IList<ProductTypeDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdProductType.AsQueryable();
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
        public override async Task<ProductTypeDto> Add(IDto data)
        {
            try
            {
                var Dto = data as ProductTypeDto;
                if (Dto == null)
                    throw new Exception("Dữ liệu không hợp lệ");
                Dto.Id = Guid.NewGuid().ToString();

                // ✅ Validate
                if (string.IsNullOrWhiteSpace(Dto.Code))
                    throw new Exception("Mã loại không được để trống");

                if (string.IsNullOrWhiteSpace(Dto.Name))
                    throw new Exception("Tên loại không được để trống");

                bool exists = await _dbContext.TblMdProductType
                    .AnyAsync(x => x.Code == Dto.Code);

                if (exists)
                    throw new Exception("Mã loại hàng hóa đã tồn tại");

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
        public async Task<List<ProductTypeDto>> ImportExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
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
            // ✅ B1. Kiểm tra tên cột (header)
            var expectedHeaders = new[] { "Mã loại hàng hóa", "Tên loại hàng hóa"  }; // các cột hợp lệ
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

            var rowCount = worksheet.Dimension.End.Row;
            var newProducts = new List<TblMdProductType>();

            for (int row = 2; row <= rowCount; row++) // dòng 1 là tiêu đề
            {
                var code = worksheet.Cells[row, 1].Text?.Trim();   // Cột A: Mã hàng hóa
                var name = worksheet.Cells[row, 2].Text?.Trim();   // Cột B: Tên hàng hóa
               
                if (code == "" ||
                        name == "" 
                        )
                {
                    var missingFields = new List<string>();
                    if (string.IsNullOrEmpty(code)) missingFields.Add("Code");
                    if (string.IsNullOrEmpty(name)) missingFields.Add("Name");
                    

                    throw new ArgumentException($"Thiếu giá trị ở các cột: {string.Join(", ", missingFields)}");
                }
                if (string.IsNullOrEmpty(code) && string.IsNullOrEmpty(name))
                    continue;

               

                // ✅ B2: kiểm tra trùng mã sản phẩm
                var existingProduct = await _dbContext.TblMdProductType
                    .FirstOrDefaultAsync(x => x.Code == code);

                if (existingProduct == null)
                {
                    var entity = new TblMdProductType
                    {
                        Id = Guid.NewGuid().ToString(),
                        Code = code,
                        Name = name,
                         // ✅ Unit = code của đơn vị tính
                        IsActive = true,
                        CreateDate = DateTime.Now
                    };
                    newProducts.Add(entity);
                }
                else
                {
                    throw new ArgumentException($"Sản phẩm có mã '{code}' đã tồn tại trong hệ thống.");
                }
            }

            // ✅ B3: lưu tất cả sản phẩm mới
            if (newProducts.Any())
            {
                _dbContext.TblMdProductType.AddRange(newProducts);
                await _dbContext.SaveChangesAsync();
            }

            var dtos = _mapper.Map<List<ProductTypeDto>>(newProducts);
            return dtos;
        }

        public override async Task<ProductTypeDto> Update(IDto data)
        {
            try
            {
                if (data is not ProductTypeDto Dto)
                    throw new Exception("Dữ liệu không hợp lệ");

                // ✅ Validate Id
                if (string.IsNullOrWhiteSpace(Dto.Id))
                    throw new Exception("Id không được để trống");

                // ✅ Tìm entity theo Id
                var entity = await _dbContext.TblMdProductType
                    .FirstOrDefaultAsync(x => x.Id == Dto.Id);

                if (entity == null)
                    throw new InvalidOperationException("Bản ghi không tồn tại");

                if (string.IsNullOrWhiteSpace(Dto.Code) ||
                       string.IsNullOrWhiteSpace(Dto.Name)
                       )
                    throw new Exception("Không được để trống thông tin");

                // ✅ Check trùng Code (loại trừ chính mình)
                bool exists = await _dbContext.TblMdProductType
                    .AnyAsync(x => x.Code == Dto.Code && x.Id != Dto.Id);

                if (exists)
                    throw new InvalidOperationException("Mã loại hàng hóa đã tồn tại");

                _mapper.Map(Dto, entity);


                _dbContext.TblMdProductType.Update(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<ProductTypeDto>(entity);
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
