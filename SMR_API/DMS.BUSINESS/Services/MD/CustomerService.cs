using AutoMapper;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.MD;
using DMS.CORE;
using DMS.CORE.Entities.MD.Attributes;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace DMS.BUSINESS.Services.MD
{
    public interface ICustomerService : IGenericService<TblMdCustomer, CustomerDto>
    {
        Task<IList<CustomerDto>> GetAll(BaseMdFilter filter);
        Task<IList<CustomerDto>> ImportExcel(IFormFile file);
        Task<IList<CustomerDto>> GetByCustomerCode(string customerCode);

    }
    public class CustomerService(AppDbContext dbContext, IMapper mapper) : GenericService<TblMdCustomer, CustomerDto>(dbContext, mapper), ICustomerService
    {
        public async Task<IList<CustomerDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdCustomer.AsQueryable();
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
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdCustomer.AsQueryable();
                if (!string.IsNullOrWhiteSpace(filter.KeyWord))
                {
                    query = query.Where(x => x.CustomerCode.ToString().Contains(filter.KeyWord) || x.FullName.Contains(filter.KeyWord));
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
     
        public async Task<IList<CustomerDto>> ImportExcel(IFormFile file)
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
            var worksheets = package.Workbook.Worksheets;
            if (worksheets.Count == 0) // Sửa: Dùng .Count == 0
            {
                throw new Exception("File Excel không hợp lệ: không chứa sheet nào");
            }

            var worksheet = worksheets.First();
            var rowCount = worksheet.Dimension.End.Row;

            // Lấy header và map với thuộc tính
            var properties = typeof(TblMdCustomer).GetProperties()
                .Where(p => p.GetCustomAttribute<ExcelColumnAttribute>() != null)
                .ToDictionary(p => p.GetCustomAttribute<ExcelColumnAttribute>().Name.ToLower(), p => p);

            var headers = new Dictionary<string, int>();
            var headerRow = worksheet.Cells[1, 1, 1, worksheet.Dimension.End.Column];
            var errors = new List<string>();

            foreach (var cell in headerRow)
            {
                var headerName = cell.Text?.Trim().ToLower();
                if (string.IsNullOrEmpty(headerName)) continue; // Bỏ qua cột không có header

                if (!properties.ContainsKey(headerName))
                {
                    errors.Add($"Tiêu đề '{headerName}' không hợp lệ.");
                }
                else if (headers.ContainsKey(headerName))
                {
                    errors.Add($"Tiêu đề '{headerName}' bị lặp lại.");
                }
                else
                {
                    headers[headerName] = cell.Start.Column;
                }
            }

            if (errors.Any())
            {
                throw new Exception("File Excel không hợp lệ:\n" + string.Join("\n", errors));
            }

            // ✅ BƯỚC 1: Đọc tất cả entity từ Excel vào bộ nhớ
            var entities = new List<TblMdCustomer>();
            var codesInFile = new List<string>();

            for (int row = 2; row <= rowCount; row++)
            {
                var entity = new TblMdCustomer();
                bool hasData = false;

                foreach (var header in headers)
                {
                    var property = properties[header.Key];
                    var rawValue = worksheet.Cells[row, header.Value].Text;

                    // XỬ LÝ ĐẶC BIỆT CHO CỘT GiaoCHXD (như đã làm ở câu trước)
                    if (property.Name == nameof(TblMdCustomer.GiaoCHXD) && !string.IsNullOrEmpty(rawValue))
                    {
                        hasData = true;
                        var lines = rawValue.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
                        var cleanedLines = lines
                            .Select(line => line.Trim())
                            .Select(line => line.StartsWith("-") ? line.Substring(1).Trim() : line.Trim())
                            .Where(line => !string.IsNullOrEmpty(line))
                            .ToList();
                        property.SetValue(entity, string.Join(", ", cleanedLines));
                    }
                    // XỬ LÝ BÌNH THƯỜNG CHO CÁC CỘT KHÁC
                    else if (!string.IsNullOrEmpty(rawValue))
                    {
                        var value = rawValue.Trim();
                        hasData = true;
                        try
                        {
                            var converter = System.ComponentModel.TypeDescriptor.GetConverter(property.PropertyType);
                            object convertedValue = converter.ConvertFrom(value);
                            property.SetValue(entity, convertedValue);
                        }
                        catch
                        {
                            property.SetValue(entity, value);
                        }
                    }
                }

                if (hasData)
                {
                    // Thêm ID và trạng thái (sẽ dùng nếu lưu)
                    entity.Id = Guid.NewGuid().ToString();
                    entity.IsActive = true;
                    entities.Add(entity);
                    if (!string.IsNullOrEmpty(entity.CustomerCode))
                    {
                        codesInFile.Add(entity.CustomerCode);
                    }
                }
            }

            if (!entities.Any())
            {
                throw new Exception("Không tìm thấy dữ liệu hợp lệ trong file Excel.");
            }

            // ✅ BƯỚC 2: Kiểm tra trùng lặp *trong file*
            var duplicateCodesInFile = codesInFile
                .GroupBy(c => c)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();

            if (duplicateCodesInFile.Any())
            {
                throw new Exception($"Import thất bại! Các mã bị trùng lặp trong file: {string.Join(", ", duplicateCodesInFile)}");
            }

            // ✅ BƯỚC 3: Kiểm tra trùng lặp *trong DB* (chỉ 1 lần query)
            var distinctCodesInFile = codesInFile.Distinct().ToList();
            var existingCodes = await _dbContext.TblMdCustomer
                .Where(x => distinctCodesInFile.Contains(x.CustomerCode))
                .Select(x => x.CustomerCode)
                .ToListAsync();

            if (existingCodes.Any())
            {
                // Đây là lỗi bạn muốn thấy!
                throw new Exception($"Import thất bại! Các mã đã tồn tại: {string.Join(", ", existingCodes)}");
            }

            // ✅ BƯỚC 4: Nếu không có lỗi, thêm tất cả vào DB
            try
            {
                _dbContext.TblMdCustomer.AddRange(entities);
                await _dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                throw new Exception("Lỗi khi lưu dữ liệu: " + (ex.InnerException?.Message ?? ex.Message));
            }

            // Trả về DTO
            return _mapper.Map<List<CustomerDto>>(entities);
        }
        public override async Task<CustomerDto> Add(IDto data)
        {
            try
            {
                var Dto = data as CustomerDto;
                var errors = new List<string>();

                if (Dto == null)
                    throw new Exception("Dữ liệu không hợp lệ");
                Dto.Id = Guid.NewGuid().ToString();

                // ✅ Validate dữ liệu
                if (string.IsNullOrWhiteSpace(Dto.CustomerCode))
                    throw new Exception("Mã khách hàng không được để trống");

                if (string.IsNullOrWhiteSpace(Dto.FullName))
                    throw new Exception("Tên khách hàng không được để trống");

                else
                {
                   
                    //if (!System.Text.RegularExpressions.Regex.IsMatch(Dto.Email.Trim(), @"^[^@\s]+@[^@\s]+\.[^@\s]+$", System.Text.RegularExpressions.RegexOptions.IgnoreCase))
                    //    errors.Add("Định dạng email không hợp lệ");
                    //string cleanPhone = Dto.Phone.Trim().Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "");
                    //if (!System.Text.RegularExpressions.Regex.IsMatch(cleanPhone, @"^0\d{9,10}$"))
                    //    errors.Add("Số điện thoại không hợp lệ (phải là 10-11 chữ số và bắt đầu bằng 0)");
                }
                    bool exists = await _dbContext.TblMdCustomer
                        .AnyAsync(x => x.CustomerCode == Dto.CustomerCode);

                if (exists)
                    throw new Exception("Mã khách hàng đã tồn tại");
                //if (errors.Any())
                //    throw new Exception($"Dữ liệu không hợp lệ: {string.Join(", ", errors)}");


               
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

        public override async Task<CustomerDto> Update(IDto data)
        {
            try
            {
                var errors = new List<string>();

                if (data is not CustomerDto Dto)
                    throw new ArgumentException("Dữ liệu không hợp lệ");

                // ✅ Validate Id
                if (string.IsNullOrWhiteSpace(Dto.Id))
                    throw new ArgumentException("Không tìm được Id");

                // ✅ Tìm entity theo Id
                var entity = await _dbContext.TblMdCustomer
                    .FirstOrDefaultAsync(x => x.Id == Dto.Id);

                if (entity == null)
                    throw new InvalidOperationException("Bản ghi không tồn tại");

                // ✅ Validate dữ liệu
                if (string.IsNullOrWhiteSpace(Dto.CustomerCode))
                    throw new ArgumentException("Mã khách hàng không được để trống");

                if (string.IsNullOrWhiteSpace(Dto.FullName))
                    throw new ArgumentException("Tên không được để trống");
                
                else
                {
             
                }
                // ✅ Check trùng Code (loại trừ chính mình)
                bool exists = await _dbContext.TblMdCustomer
                    .AnyAsync(x => x.CustomerCode == Dto.CustomerCode && x.Id != Dto.Id);

                if (exists)
                    throw new InvalidOperationException("Mã khách hàng đã tồn tại");
                if (errors.Any())
                    throw new ArgumentException($"Dữ liệu không hợp lệ: {string.Join(", ", errors)}");
                //bool vatExists = await _dbContext.TblMdCustomer
                //    .AnyAsync(x => x.VatNumber == Dto.VatNumber.Trim().Replace("-", "").Replace(" ", "") && x.Id != Dto.Id);
                //if (vatExists)
                //    throw new Exception("Mã số thuế đã tồn tại");

                //// Kiểm tra trùng lặp email
                //bool emailExists = await _dbContext.TblMdCustomer
                //    .AnyAsync(x => x.Email.ToLower() == Dto.Email.Trim().ToLower() && x.Id != Dto.Id);
                //if (emailExists)
                //    throw new Exception("Email đã tồn tại");
                _mapper.Map(Dto, entity);


                _dbContext.TblMdCustomer.Update(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<CustomerDto>(entity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public async Task<IList<CustomerDto>> GetByCustomerCode(string customerCode)
        {
            try
            {
                var query = _dbContext.Set<TblMdCustomer>().AsQueryable();
                query = query.Where(x => x.CustomerCode == customerCode);
                var lstEntity = await query.ToListAsync();
                return _mapper.Map<List<CustomerDto>>(lstEntity);
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
