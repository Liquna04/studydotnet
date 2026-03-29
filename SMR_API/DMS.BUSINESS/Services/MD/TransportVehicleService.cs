using AutoMapper;
using AutoMapper.QueryableExtensions;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.MD;
using DMS.CORE;
using DMS.CORE.Entities.MD;
using DMS.CORE.Entities.MD.Attributes;
using DocumentFormat.OpenXml.Office2010.Excel;
using DocumentFormat.OpenXml.Office2016.Drawing.ChartDrawing;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using NPOI.SS.Formula.Functions;
using OfficeOpenXml;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Services.MD
{
    public interface ITransportVehicleService : IGenericService<TblMdTransportVehicle, TransportVehicleDto>
    {
        Task<IList<TransportVehicleDto>> GetAll(BaseMdFilter filter);
        Task<TransportVehicleCreateUpdateDto> AddCustom(TransportVehicleCreateUpdateDto data);
        Task UpdateCustom(TransportVehicleCreateUpdateDto data);

        Task<IList<TransportVehicleDto>> ImportExcel(IFormFile file);



    }
    public class TransportVehicleService(AppDbContext dbContext, IMapper mapper) : GenericService<TblMdTransportVehicle, TransportVehicleDto>(dbContext, mapper), ITransportVehicleService
    {
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdTransportVehicle.Include(p => p.TransportType).AsQueryable();
                if (!string.IsNullOrWhiteSpace(filter.KeyWord))
                {
                    query = query.Where(x => x.Code.ToString().Contains(filter.KeyWord) || x.Name.Contains(filter.KeyWord));
                }
                if (filter.IsActive.HasValue)
                {
                    query = query.Where(x => x.IsActive == filter.IsActive);
                }
                query = query.OrderByDescending(x => x.CreateDate);
                var projectedQuery = query.ProjectTo<TransportVehicleDto>(_mapper.ConfigurationProvider);

                return await Paging(query, filter);

            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }


        public async Task<IList<TransportVehicleDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblMdTransportVehicle.Include(p => p.TransportType).AsQueryable();
                if (filter.IsActive.HasValue)
                {
                    query = query.Where(x => x.IsActive == filter.IsActive);
                }
                var result = await query
           .OrderByDescending(x => x.CreateDate)
           .ProjectTo<TransportVehicleDto>(_mapper.ConfigurationProvider)
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
    
        public async Task<IList<TransportVehicleDto>> ImportExcel(IFormFile file)
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

            var rowCount = worksheet.Dimension.End.Row;
            var entities = new List<TblMdTransportVehicle>(); // ✅ Đổi tên cho rõ ràng
            var duplicateCodes = new List<string>();

            // Đọc tiêu đề từ dòng 1 và ánh xạ với attribute
            var headers = new Dictionary<string, int>();
            var headerRow = worksheet.Cells[1, 1, 1, worksheet.Dimension.End.Column];
            var properties = typeof(TblMdTransportVehicle).GetProperties()
                .Where(p => p.GetCustomAttribute<ExcelColumnAttribute>() != null)
                .ToDictionary(p => p.GetCustomAttribute<ExcelColumnAttribute>().Name.ToLower(), p => p);

            foreach (var cell in headerRow)
            {
                var headerName = cell.Text?.Trim().ToLower();
                if (headerName != null && properties.ContainsKey(headerName))
                {
                    headers[headerName] = cell.Start.Column;
                }
            }

            for (int row = 2; row <= rowCount; row++)
            {
                var entity = new TblMdTransportVehicle();
                bool hasData = false;

                // ✅ Chỉ cần biến tạm cho Type
                string rawTypeValue = null;

                foreach (var header in headers)
                {
                    var property = properties[header.Key];
                    var value = worksheet.Cells[row, header.Value].Text?.Trim();

                    if (string.IsNullOrEmpty(value))
                    {
                        continue;
                    }

                    hasData = true;

                    // ✅ BƯỚC 1: Chỉ chặn lại trường 'Type'
                    if (property.Name == nameof(TblMdTransportVehicle.Type))
                    {
                        rawTypeValue = value;
                        continue; // Chưa gán, đi đến cột tiếp theo
                    }

                    // ✅ Gán bình thường cho các trường còn lại (Code, Name, Capacity, và Driver)
                    try
                    {
                        var converter = System.ComponentModel.TypeDescriptor.GetConverter(property.PropertyType);
                        object convertedValue = converter.ConvertFrom(value);
                        property.SetValue(entity, convertedValue);
                    }
                    catch
                    {
                        property.SetValue(entity, value); // Gán giá trị string thô
                    }
                }

                if (hasData)
                {
                    // ✅ BƯỚC 2: Chỉ xử lý trường 'Type'
                    if (!string.IsNullOrEmpty(rawTypeValue))
                    {
                        string typeCode = rawTypeValue.Split(" - ")[0].Trim();

                        // Giả định bạn có bảng TblMdTransportType trong _dbContext
                        var transportType = await _dbContext.TblMdTransportType
                            .FirstOrDefaultAsync(t => t.Code == typeCode);

                        if (transportType == null)
                        {
                            throw new ArgumentException($"Loại phương tiện có mã '{typeCode}' (từ chuỗi '{rawTypeValue}' ở dòng {row}) không tồn tại.");
                        }
                        entity.Type = transportType.Code; // Gán mã đã được xác thực
                    }

                    // ✅ BƯỚC 3: Kiểm tra trùng lặp (dùng entity.Code đã được gán)
                    if (string.IsNullOrEmpty(entity.Code))
                    {
                        throw new ArgumentException($"Thiếu 'Mã phương tiện' ở dòng {row}.");
                    }

                    var existingStorage = await _dbContext.TblMdTransportVehicle
                        .FirstOrDefaultAsync(x => x.Code == entity.Code);

                    if (existingStorage == null)
                    {
                        entity.Id = Guid.NewGuid().ToString();
                        entity.IsActive = true;
                        entities.Add(entity);
                    }
                    else
                    {
                        duplicateCodes.Add(entity.Code);
                    }
                }
            }

            if (duplicateCodes.Any())
            {
                this.Status = false;
                throw new Exception($"Import thất bại! Các mã đã tồn tại: {string.Join(", ", duplicateCodes.Distinct())}");
            }
            else if (entities.Any())
            {
                _dbContext.TblMdTransportVehicle.AddRange(entities);
                await _dbContext.SaveChangesAsync();
                this.Status = true;
            }



            // ✅ Map tất cả entities về DTO 
            var dtos = _mapper.Map<List<TransportVehicleDto>>(entities);

            return dtos;
        }

        public async Task<TransportVehicleCreateUpdateDto> AddCustom(TransportVehicleCreateUpdateDto data)
        {
            try
            {
                data.Id = Guid.NewGuid().ToString();

                if (string.IsNullOrWhiteSpace(data.Code) ||
                    string.IsNullOrWhiteSpace(data.Name) ||
                    string.IsNullOrWhiteSpace(data.Type))
                    throw new Exception("Không được để trống thông tin");

                bool exists = await _dbContext.TblMdTransportVehicle.AnyAsync(x => x.Code == data.Code);
                if (exists)
                    throw new Exception("Mã phương tiện đã tồn tại");

                var entity = _mapper.Map<TblMdTransportVehicle>(data);
                await _dbContext.TblMdTransportVehicle.AddAsync(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<TransportVehicleCreateUpdateDto>(entity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

        public async Task UpdateCustom(TransportVehicleCreateUpdateDto data)
        {
            try
            {
                var entity = await _dbContext.TblMdTransportVehicle.FirstOrDefaultAsync(x => x.Id == data.Id);
                if (entity == null)
                    throw new Exception("Không tìm thấy bản ghi cần cập nhật");

                _mapper.Map(data, entity);
                _dbContext.TblMdTransportVehicle.Update(entity);
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
