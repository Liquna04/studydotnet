using AutoMapper;
using AutoMapper.QueryableExtensions;
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
    public interface IProductListService : IGenericService<TblMdProductList, ProductListDto>
    {
        Task<IList<ProductListDto>> GetAll(BaseMdFilter filter);
        Task UpdateInfo(ProductListCreateUpdateDto data);
        Task<ProductListCreateUpdateDto> AddCustom(ProductListCreateUpdateDto data);
        Task<List<ProductListDto>> ImportExcel(IFormFile file);


    }
    public class ProductListService(AppDbContext dbContext, IMapper mapper) : GenericService<TblMdProductList, ProductListDto>(dbContext, mapper), IProductListService
    {
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdProductList.Include(p => p.ProductType).Include(p => p.UnitProduct).Include(p => p.BasicUnitProduct).AsQueryable();
                if (!string.IsNullOrWhiteSpace(filter.KeyWord))
                {
                    query = query.Where(x => x.Name.ToString().Contains(filter.KeyWord) || x.Code.Contains(filter.KeyWord));
                }
                if (filter.IsActive.HasValue)
                {
                    query = query.Where(x => x.IsActive == filter.IsActive);
                }
                query = query.OrderByDescending(x => x.CreateDate);
                var projectedQuery = query.ProjectTo<ProductListDto>(_mapper.ConfigurationProvider);
                return await Paging(query, filter);

            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }


        public async Task<IList<ProductListDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdProductList.Include(p => p.ProductType).Include(p => p.UnitProduct).Include(p => p.BasicUnitProduct).AsQueryable();
                if (filter.IsActive.HasValue)
                {
                    query = query.Where(x => x.IsActive == filter.IsActive);
                }
                var result = await query
            .OrderByDescending(x => x.CreateDate)
            .ProjectTo<ProductListDto>(_mapper.ConfigurationProvider)
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
        //public override async Task<ProductListCreateUpdateDto> Add(IDto data)
        //{
        //    try
        //    {
        //        var Dto = data as ProductListCreateUpdateDto;
        //        if (Dto == null)
        //            throw new Exception("Dữ liệu không hợp lệ");
        //        Dto.Id = Guid.NewGuid().ToString();

        //        // ✅ Validate dữ liệu
        //        if (string.IsNullOrWhiteSpace(Dto.Code) || string.IsNullOrWhiteSpace(Dto.Name) || string.IsNullOrWhiteSpace(Dto.Type)
        //            || string.IsNullOrWhiteSpace(Dto.Unit) )
        //            throw new ArgumentException("Không được để trống thông tin");

        //        bool exists = await _dbContext.TblMdProductList
        //            .AnyAsync(x => x.Code == Dto.Code);

        //        if (exists)
        //            throw new Exception("Mã code đã tồn tại");

        //        // ✅ Gọi base để lưu
        //        return await base.Add(Dto);
        //    }
        //    catch (Exception ex)
        //    {
        //        Status = false;
        //        Exception = ex;
        //        return null;
        //    }
        //}
        public async Task<ProductListCreateUpdateDto> AddCustom(ProductListCreateUpdateDto data)
        {
            try
            {
                data.Id = Guid.NewGuid().ToString();

                if (string.IsNullOrWhiteSpace(data.Code) ||
                    string.IsNullOrWhiteSpace(data.Name) ||
                    string.IsNullOrWhiteSpace(data.Type) ||
                    string.IsNullOrWhiteSpace(data.Unit) ||
                    string.IsNullOrWhiteSpace(data.BasicUnit
                    ))
                    throw new Exception("Không được để trống thông tin");

                bool exists = await _dbContext.TblMdProductList.AnyAsync(x => x.Code == data.Code);
                if (exists)
                    throw new Exception("Mã hàng hóa đã tồn tại");

                var entity = _mapper.Map<TblMdProductList>(data);
                await _dbContext.TblMdProductList.AddAsync(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<ProductListCreateUpdateDto>(entity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

    
        public async Task UpdateInfo(ProductListCreateUpdateDto data)
        {
            try
            {
                var entity = await _dbContext.TblMdProductList.FirstOrDefaultAsync(x => x.Id == data.Id);
                if (entity == null)
                    throw new Exception("Không tìm thấy bản ghi cần cập nhật");

                _mapper.Map(data, entity);
                _dbContext.TblMdProductList.Update(entity);
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
            }
        }

      

        public async Task<List<ProductListDto>> ImportExcel(IFormFile file)
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
            var expectedHeaders = new[] { "Mã hàng hóa", "Tên hàng hóa", "Loại hàng hóa", "Đơn vị tính","Đơn vị tính cơ bản" }; // các cột hợp lệ
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
            var newProducts = new List<TblMdProductList>();

            for (int row = 2; row <= rowCount; row++) // dòng 1 là tiêu đề
            {
                var code = worksheet.Cells[row, 1].Text?.Trim();   // Cột A: Mã hàng hóa
                var name = worksheet.Cells[row, 2].Text?.Trim();   // Cột B: Tên hàng hóa
                var type = worksheet.Cells[row, 3].Text?.Trim();   // Cột C: Loại hàng hóa
                var unit = worksheet.Cells[row, 4].Text?.Trim(); // Cột D: Tên đơn vị tính
                var basicUnit = worksheet.Cells[row, 5].Text?.Trim(); // Cột E: Đơn vị tính cơ bản
                if (code == "" ||
                        name == "" ||
                        type == "" ||
                        unit == "" || 
                        basicUnit == "")
                        
                {
                    var missingFields = new List<string>();
                    if (string.IsNullOrEmpty(code)) missingFields.Add("Code");
                    if (string.IsNullOrEmpty(name)) missingFields.Add("Name");
                    if (string.IsNullOrEmpty(type)) missingFields.Add("Type");
                    if (string.IsNullOrEmpty(unit)) missingFields.Add("Unit");
                    if (string.IsNullOrEmpty(basicUnit)) missingFields.Add("BasicUnit");

                    throw new ArgumentException($"Thiếu giá trị ở các cột: {string.Join(", ", missingFields)}");
                }
                if (string.IsNullOrEmpty(code) && string.IsNullOrEmpty(name))
                    continue;

                string unitCode = null;
                if (!string.IsNullOrEmpty(unit))
                {
                    // ✅ BƯỚC THÊM: Tách chuỗi để lấy mã (Code)
                    string unitCodeFromExcel = unit.Split(" - ")[0].Trim();

                    var units = await _dbContext.TblMdUnitProduct
                        // ✅ SỬA: Truy vấn bằng mã đã tách
                        .FirstOrDefaultAsync(u => u.Code == unitCodeFromExcel);

                    if (units != null)
                    {
                        unitCode = units.Code;
                    }
                    else
                    {
                        // Cập nhật thông báo lỗi cho rõ ràng
                        throw new ArgumentException($"Đơn vị tính có mã '{unitCodeFromExcel}' (từ chuỗi '{unit}') không tồn tại");
                    }
                }

                string basicUnitCode = null;
                if (!string.IsNullOrEmpty(basicUnit))
                {
                    // ✅ BƯỚC THÊM: Tách chuỗi để lấy mã (Code)
                    string basicUnitCodeFromExcel = basicUnit.Split(" - ")[0].Trim();

                    var basicUnits = await _dbContext.TblMdUnitProduct
                        // ✅ SỬA: Truy vấn bằng mã đã tách
                        .FirstOrDefaultAsync(u => u.Code == basicUnitCodeFromExcel);

                    if (basicUnits != null)
                    {
                        basicUnitCode = basicUnits.Code;
                    }
                    else
                    {
                        throw new ArgumentException($"Đơn vị tính cơ bản có mã '{basicUnitCodeFromExcel}' (từ chuỗi '{basicUnit}') không tồn tại");
                    }
                }
                string typeCode = null;
                if (!string.IsNullOrEmpty(type))
                {
                    // ✅ BƯỚC 1: Tách chuỗi để lấy mã (Code)
                    string typeCodeFromExcel = type.Split(" - ")[0].Trim();

                    // ✅ BƯỚC 2: Truy vấn bằng MÃ (Code) đã tách
                    var productType = await _dbContext.TblMdProductType
                        .FirstOrDefaultAsync(u => u.Code == typeCodeFromExcel);

                    if (productType != null)
                    {
                        // ✅ BƯỚC 3: Lấy mã đã được xác thực
                        typeCode = productType.Code;
                    }
                    else
                    {
                        // Cập nhật thông báo lỗi cho chính xác
                        throw new ArgumentException($"Loại hàng hóa có mã '{typeCodeFromExcel}' (từ chuỗi '{type}') không tồn tại");
                    }
                }

                // ✅ B2: kiểm tra trùng mã sản phẩm
                var existingProduct = await _dbContext.TblMdProductList
                    .FirstOrDefaultAsync(x => x.Code == code);

                if (existingProduct == null)
                {
                    var entity = new TblMdProductList
                    {
                        Id = Guid.NewGuid().ToString(),
                        Code = code,
                        Name = name,
                        Type = typeCode,
                        Unit = unitCode,
                        BasicUnit = basicUnitCode,
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
                _dbContext.TblMdProductList.AddRange(newProducts);
                await _dbContext.SaveChangesAsync();
            }

            var dtos = _mapper.Map<List<ProductListDto>>(newProducts);
            return dtos;
        }

    }
}


