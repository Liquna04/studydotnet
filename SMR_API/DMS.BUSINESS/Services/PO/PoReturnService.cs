using AutoMapper;
using AutoMapper.QueryableExtensions;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.CM;
using DMS.BUSINESS.Dtos.MD;
using DMS.BUSINESS.Dtos.PO;
using DMS.BUSINESS.Services.MD;
using DMS.CORE;
using DMS.CORE.Entities.MD;
using DMS.CORE.Entities.PO;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Services.PO
{
    public interface IPoReturnService : IGenericService<TblPoHhkReturn, PoHhkReturnDto>
    {
        Task<IList<PoHhkReturnDto>> GetAll(BaseMdFilter filter);
        Task<IList<PoHhkDto>> GetAllOrders(BaseFilter filter);
        Task<IList<PoHhkReturnDto>> GetAllReturnsFiltered(ReturnFilterDto filterDto);

        Task<PoHhkReturnDto> GetReturnByCode(string code);

        Task UpdateReturnCustom(PoHhkReturnCreateUpdateDto data);
        Task UpdateDetailReturnCustom(PoHhkDetailReturnDto data);
        Task<PoHhkReturnCreateUpdateDto> AddReturnCustom(PoHhkReturnCreateUpdateDto data);
        Task<PoHhkDetailReturnDto> AddDetailReturnCustom(PoHhkDetailReturnDto data);
        Task DeleteCustom(string pkid);
        Task<IList<PoHhkHistoryReturnDto>> GetReturnHistory(string headerCode);

        Task<IList<PoHhkHistoryDetailReturnDto>> GetReturnHistoryDetail(string headerCode);
        Task<IList<PoHhkReturnCreateUpdateDto>> CancelReturns(List<string> codes);

        Task<IList<PoHhkReturnCreateUpdateDto>> SubmitReturns(List<string> codes);
        Task<PoHhkReturnCreateUpdateDto> ApproveReturn(string code);
        Task<PoHhkReturnCreateUpdateDto> RejectReturn(string code);
        Task<PoHhkReturnCreateUpdateDto> ConfirmReturn(string code);

    }
    public class PoReturnService(AppDbContext dbContext, IMapper mapper) : GenericService<TblPoHhkReturn, PoHhkReturnDto>(dbContext, mapper), IPoReturnService
    {
        public override async Task<PagedResponseDto> Search(BaseFilter filter)
        {
            try
            {
                // Ép kiểu chính xác sang ReturnFilterDto
                var returnFilter = filter as ReturnFilterDto;

                var query = _dbContext.TblPoHhkReturn
                    .Include(p => p.PoHhkDetailReturn)
                    .AsQueryable();

                // --- Keyword filter ---
                if (!string.IsNullOrWhiteSpace(returnFilter?.KeyWord))
                {
                    var keyword = returnFilter.KeyWord.ToLower();
                    query = query.Where(x =>
                        x.Code.ToLower().Contains(keyword) ||
                        x.OrderCode.ToLower().Contains(keyword) ||
                        x.CustomerName.ToLower().Contains(keyword) ||
                        x.CustomerCode.ToLower().Contains(keyword));
                }

                // --- Áp dụng quyền truy cập ---
                if (!string.IsNullOrWhiteSpace(returnFilter?.AccountType))
                {
                    if (returnFilter.AccountType == "KD")
                    {
                        query = query.Where(x =>
                            x.CreateBy == returnFilter.UserName ||
                            (x.CreateBy != returnFilter.UserName && x.Status != "1"));
                    }
                    else if (returnFilter.AccountType == "CH")
                    {
                        query = query.Where(x =>
                            x.CreateBy == returnFilter.UserName);
                    }
                    // *** KHỐI LOGIC MỚI CHO KT ***
                    else if (returnFilter.AccountType == "KT")
                    {
                        // KT account: Show only OUT_PROVINCE orders that are in quantity-approved state ("-3") or beyond
                        query = query.Where(x =>
                            x.PoType == "OUT_PROVINCE" &&
                            (x.Status == "-3" || x.Status == "3" || x.Status == "4" || x.Status == "5" || x.Status == "-1")
                        );
                    }
                    else if (returnFilter.AccountType == "KH")
                    {
                        query = query.Where(x => x.CreateBy == returnFilter.UserName);
                    }
                }

                // --- Sắp xếp ---
                query = query.OrderByDescending(x => x.CreateDate ).ThenByDescending(x => x.Status)
;

                return await Paging(query, filter);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

        //public override async Task<PagedResponseDto> Search(BaseFilter filter)
        //{
        //    try
        //    {
        //        var query = _dbContext.TblPoHhkReturn.Include(p => p.PoHhkDetailReturn).AsQueryable();
        //        if (!string.IsNullOrWhiteSpace(filter.KeyWord))
        //        {
        //            query = query.Where(x => x.CustomerName.ToString().Contains(filter.KeyWord) || x.Code.Contains(filter.KeyWord) || x.CustomerCode.ToString().Contains(filter.KeyWord) || x.OrderCode.ToString().Contains(filter.KeyWord));
        //        }
        //        if (filter.IsActive.HasValue)
        //        {
        //            query = query.Where(x => x.IsActive == filter.IsActive);
        //        }
        //        query = query.OrderByDescending(x => x.CreateDate);
        //        var projectedQuery = query.ProjectTo<PoHhkReturnDto>(_mapper.ConfigurationProvider);
        //        return await Paging(query, filter);

        //    }
        //    catch (Exception ex)
        //    {
        //        Status = false;
        //        Exception = ex;
        //        return null;
        //    }
        //}
        public async Task<IList<PoHhkReturnDto>> GetAll(BaseMdFilter filter)
        {
            try
            {
                var query = _dbContext.TblPoHhkReturn.Include(p => p.PoHhkDetailReturn).AsQueryable();
                if (filter.IsActive.HasValue)
                {
                    query = query.Where(x => x.IsActive == filter.IsActive);
                }
                var result = await query
            .OrderByDescending(x => x.CreateDate).ThenByDescending(x => x.Status)

            .ProjectTo<PoHhkReturnDto>(_mapper.ConfigurationProvider)
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
        public async Task<IList<PoHhkDto>> GetAllOrders(BaseFilter filter)
        {
            try
            {
                var query = _dbContext.TblPoHhk.AsQueryable();

                if (!string.IsNullOrWhiteSpace(filter.KeyWord))
                {
                    query = query.Where(x =>
                        x.Code.Contains(filter.KeyWord) ||
                        x.CustomerName.Contains(filter.KeyWord) ||
                        x.CustomerCode.Contains(filter.KeyWord));
                }

                query = query.OrderByDescending(x => x.CreateDate);

                var result = await query.ToListAsync();
                return _mapper.Map<IList<PoHhkDto>>(result);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public async Task<IList<PoHhkReturnDto>> GetAllReturnsFiltered(ReturnFilterDto filterDto)
        {
            try
            {
                var query = _dbContext.TblPoHhkReturn.Include(p => p.PoHhkDetailReturn).AsQueryable();

                // Apply search filter
                if (!string.IsNullOrWhiteSpace(filterDto.KeyWord))
                {
                    query = query.Where(x =>
                        x.Code.Contains(filterDto.KeyWord) ||
                        x.CustomerName.Contains(filterDto.KeyWord) ||
                        x.CustomerCode.Contains(filterDto.KeyWord));
                }

                // Apply account type filter
                if (filterDto.AccountType == "KD")
                {
                    // KD account: Show own orders (any status) OR orders from KH with STATUS > 1 (not in "Khởi tạo" state)
                    query = query.Where(x =>
                        x.CreateBy == filterDto.UserName ||
                        (x.CreateBy != filterDto.UserName && x.Status != "1")
                    );
                }
                else if (filterDto.AccountType == "CH")
                {
                    query = query.Where(x =>
                        x.CreateBy == filterDto.UserName );
                }
                else if (filterDto.AccountType == "KH")
                {
                    // 1. Tìm CustomerCode từ bảng mapping TblAdAccountCustomer dựa trên UserName
                    var mapAccount = await _dbContext.TblAdAccountCustomer
                                            .AsNoTracking()
                                            .FirstOrDefaultAsync(x => x.UserName == filterDto.UserName);

                    // 2. Nếu tìm thấy mapping hợp lệ (User này đã được gán với 1 Mã Khách Hàng)
                    if (mapAccount != null && !string.IsNullOrEmpty(mapAccount.CustomerCode))
                    {
                        string myCustomerCode = mapAccount.CustomerCode;

                        // 3. Lọc đơn trả hàng theo CustomerCode
                        // Điều này sẽ lấy được cả:
                        // - Đơn do chính KH tạo (thường có CustomerCode này)
                        // - Đơn do CH tạo giùm cho KH này (cũng có CustomerCode này)
                        query = query.Where(x => x.CustomerCode == myCustomerCode);
                    }
                    else
                    {
                        // Nếu user KH chưa được gán mã khách hàng -> Không trả về dữ liệu nào (hoặc trả về list rỗng)
                        return new List<PoHhkReturnDto>();
                    }
                }
                query = query.OrderByDescending(x => x.CreateDate);

                var result = await query.ToListAsync();
                return _mapper.Map<IList<PoHhkReturnDto>>(result);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return new List<PoHhkReturnDto>();
            }
        }

        public async Task<PoHhkReturnDto> GetReturnByCode(string code)
        {
            try
            {
                var data = await _dbContext.TblPoHhkReturn
                   .Include(x => x.PoHhkDetailReturn)
                .FirstOrDefaultAsync(x => x.Code == code);

                return _mapper.Map<PoHhkReturnDto>(data);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        //public async Task<PoHhkReturnCreateUpdateDto> AddReturnCustom(PoHhkReturnCreateUpdateDto data)
        //{
        //    try
        //    {
        //        data.Code = await GenerateReturnCode();
        //        var now = DateTime.Now;


        //        if (
        //            string.IsNullOrWhiteSpace(data.OrderCode) ||
        //            string.IsNullOrWhiteSpace(data.CustomerCode) ||
        //            string.IsNullOrWhiteSpace(data.CustomerName))
        //            throw new ArgumentException("Không được để trống thông tin");

        //        bool exists = await _dbContext.TblPoHhkReturn.AnyAsync(x => x.Code == data.Code);
        //        if (exists)
        //            throw new Exception("Mã code đã tồn tại");

        //        var entity = _mapper.Map<TblPoHhkReturn>(data);
        //        await _dbContext.TblPoHhkReturn.AddAsync(entity);
        //        await _dbContext.SaveChangesAsync();
        //        return _mapper.Map<PoHhkReturnCreateUpdateDto>(entity);
        //    }
        //    catch (Exception ex)
        //    {
        //        Status = false;
        //        Exception = ex;
        //        return null;
        //    }
        //}
        public async Task<PoHhkReturnCreateUpdateDto> AddReturnCustom(PoHhkReturnCreateUpdateDto data)
        {
            try
            {
                // Bước 1: Tạo mã mới
                data.Code = await GenerateReturnCode();

                // Kiểm tra dữ liệu bắt buộc
                if (string.IsNullOrWhiteSpace(data.PoType) || 
                    string.IsNullOrWhiteSpace(data.OrderCode))
                    throw new ArgumentException("Không được để trống thông tin");

                // Kiểm tra mã trùng
                bool exists = await _dbContext.TblPoHhkReturn.AnyAsync(x => x.OrderCode == data.OrderCode);
                if (exists)
                    throw new Exception("Đơn trả hàng đã tồn tại");

                // Bước 2: Thêm bản ghi mới
                var entity = _mapper.Map<TblPoHhkReturn>(data);
                await _dbContext.TblPoHhkReturn.AddAsync(entity);
                await _dbContext.SaveChangesAsync();

                // Bước 3: Cập nhật trạng thái + ghi lịch sử (gọi CreateReturn)
                var updatedReturn = await CreateReturn(data.Code);

                // Nếu cập nhật thất bại, vẫn trả về bản ghi đã tạo (không rollback)
                return updatedReturn ?? _mapper.Map<PoHhkReturnCreateUpdateDto>(entity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

        public async Task<PoHhkReturnCreateUpdateDto> CreateReturn(string code)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(code))
                {
                    Status = false;
                    Exception = new ArgumentException("Mã đơn hàng không được để trống");
                    return null;
                }

                var order = await _dbContext.TblPoHhkReturn
                    .FirstOrDefaultAsync(x => x.Code == code);

                if (order == null)
                {
                    Status = false;
                    Exception = new Exception($"Không tìm thấy đơn hàng {code}");
                    return null;
                }

                var now = DateTime.Now;
                const string userId = "SYSTEM";

                // Cập nhật trạng thái
                order.Status = "1";
                order.UpdateDate = now;
                order.UpdateBy = userId;

                _dbContext.TblPoHhkReturn.Update(order);

                // Ghi lịch sử
                var history = new TblPoHhkHistoryReturn
                {
                    Pkid = Guid.NewGuid().ToString(),
                    HeaderCode = code,
                    Status = "1",
                    Notes = "Đơn trả hàng đã được khởi tạo",
                    StatusDate = now,
                    CreateBy = userId,
                    CreateDate = now
                };

                _dbContext.TblPoHhkHistoryReturn.Add(history);

                // Lưu tất cả thay đổi (không cần transaction)
                await _dbContext.SaveChangesAsync();

                Status = true;
                return _mapper.Map<PoHhkReturnCreateUpdateDto>(order);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public async Task<PoHhkDetailReturnDto> AddDetailReturnCustom(PoHhkDetailReturnDto data)
        {
            try
            {
                data.Pkid = Guid.NewGuid().ToString();

                if (string.IsNullOrWhiteSpace(data.HeaderCode) ||
                    string.IsNullOrWhiteSpace(data.MaterialCode))
                    throw new ArgumentException("Không được để trống thông tin");

                bool exists = await _dbContext.TblPoHhkDetailReturn.AnyAsync(x => x.Pkid == data.Pkid);
                if (exists)
                    throw new Exception("Mã code đã tồn tại");

                var entity = _mapper.Map<TblPoHhkDetailReturn>(data);
                await _dbContext.TblPoHhkDetailReturn.AddAsync(entity);
                await _dbContext.SaveChangesAsync();

                return _mapper.Map<PoHhkDetailReturnDto>(entity);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public async Task UpdateReturnCustom(PoHhkReturnCreateUpdateDto data)
        {
            try
            {
                var entity = await _dbContext.TblPoHhkReturn.FirstOrDefaultAsync(x => x.Code == data.Code);
                if (entity == null)
                    throw new Exception("Không tìm thấy bản ghi cần cập nhật");

                var now = DateTime.Now;
                // TODO: Thay thế "SYSTEM" bằng tên người dùng đã xác thực
                const string userId = "SYSTEM";

                // 1. Ánh xạ dữ liệu mới và cập nhật thông tin
                _mapper.Map(data, entity);
                entity.UpdateDate = now;
                entity.UpdateBy = userId;

                _dbContext.TblPoHhkReturn.Update(entity);

                // 2. Lưu thay đổi của entity chính (Giống AddReturnCustom)
                await _dbContext.SaveChangesAsync();

                // 3. Gọi hàm helper để ghi lịch sử (Giống AddReturnCustom gọi CreateReturn)
                await LogReturnUpdate(data.Code, userId);

                Status = true; // Báo hiệu thành công
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                // Không cần Rollback vì chúng ta không dùng Transaction,
                // để mô phỏng chính xác mẫu của AddReturnCustom
            }
        }
        // (Thêm phương thức này vào class PoReturnService)

        public async Task LogReturnUpdate(string code, string userId)
        {
            try
            {
                var now = DateTime.Now;

                // Ghi lịch sử với Status = "0"
                var history = new TblPoHhkHistoryReturn
                {
                    Pkid = Guid.NewGuid().ToString(),
                    HeaderCode = code,
                    Status = "0", // Trạng thái "0" 
                    Notes = "Chỉnh sửa thông tin",
                    StatusDate = now,
                    CreateBy = userId,
                    CreateDate = now
                };

                await _dbContext.TblPoHhkHistoryReturn.AddAsync(history);
                await _dbContext.SaveChangesAsync();

                Status = true;
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                // Ghi chú: Giống như AddReturnCustom, chúng ta bắt lỗi
                // nhưng không ném lại để không làm hỏng phương thức cha.
            }
        }
        public async Task UpdateDetailReturnCustom(PoHhkDetailReturnDto data)
        {
            try
            {
                var entity = await _dbContext.TblPoHhkDetailReturn
           .FirstOrDefaultAsync(x => x.Pkid == data.Pkid);

                if (entity == null)
                    throw new Exception("Không tìm thấy bản ghi cần cập nhật");

                // Giữ nguyên HeaderCode, không cho map đè
                var headerCode = entity.HeaderCode;

                // Map các trường khác
                _mapper.Map(data, entity);

                // Restore lại HeaderCode (phòng khi AutoMapper ghi đè)
                entity.HeaderCode = headerCode;

                // Không cần gọi Update vì entity đang được tracking rồi
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
            }
        }
        private async Task<string> GenerateReturnCode()
        {
            var datePrefix = DateTime.Now.ToString("yyyyMMdd");
            var prefix = $"RT{datePrefix}";

            // Get max sequence for today
            var lastCode = await _dbContext.TblPoHhkReturn
                .Where(x => x.Code.StartsWith(prefix))
                .OrderByDescending(x => x.Code)
                .Select(x => x.Code)
                .FirstOrDefaultAsync();

            int sequence = 1;
            if (!string.IsNullOrEmpty(lastCode) && lastCode.Length >= prefix.Length + 4)
            {
                var seqStr = lastCode.Substring(prefix.Length);
                if (int.TryParse(seqStr, out int lastSeq))
                {
                    sequence = lastSeq + 1;
                }
            }

            return $"{prefix}{sequence:D4}";
        }
        public async Task DeleteCustom(string pkid)
        {
            try
            {
                var entity = await _dbContext.TblPoHhkDetailReturn.FindAsync(pkid);
                if (entity != null)
                {
                    _dbContext.TblPoHhkDetailReturn.Remove(entity);
                    await _dbContext.SaveChangesAsync();
                }

                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
            }
        }
        public async Task<IList<PoHhkHistoryReturnDto>> GetReturnHistory(string headerCode)
        {
            try
            {
                var history = await _dbContext.TblPoHhkHistoryReturn
                    .Where(x => x.HeaderCode == headerCode)
                    .OrderByDescending(x => x.StatusDate)
                    .ToListAsync();

                return _mapper.Map<IList<PoHhkHistoryReturnDto>>(history);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

        public async Task<IList<PoHhkHistoryDetailReturnDto>> GetReturnHistoryDetail(string headerCode)
        {
            try
            {
                var history = await _dbContext.TblPoHhkHistoryReturn
                    .Where(x => x.HeaderCode == headerCode)
                    .OrderByDescending(x => x.StatusDate)
                    .ToListAsync();

                var result = new List<PoHhkHistoryDetailReturnDto>();

                foreach (var h in history)
                {
                    var user = await _dbContext.TblAdAccount
                        .AsNoTracking()
                        .FirstOrDefaultAsync(u => u.UserName == h.CreateBy);

                    result.Add(new PoHhkHistoryDetailReturnDto
                    {
                        Pkid = h.Pkid,
                        HeaderCode = h.HeaderCode,
                        Status = h.Status,
                        Notes = h.Notes,
                        StatusDate = h.StatusDate,
                        CreateBy = h.CreateBy,
                        UserFullName = user?.FullName ?? h.CreateBy,
                        CreateDate = h.CreateDate
                    });
                }

                return result;
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return new List<PoHhkHistoryDetailReturnDto>();
            }
        }
        //public async Task<PoHhkReturnCreateUpdateDto> CreateReturn(string code)
        //{
        //    using var transaction = await _dbContext.Database.BeginTransactionAsync();
        //    try
        //    {
        //        if (string.IsNullOrWhiteSpace(code))
        //        {
        //            Status = false;
        //            Exception = new ArgumentException("Mã đơn hàng không được để trống");
        //            return null;
        //        }

        //        var order = await _dbContext.TblPoHhkReturn
        //            .FirstOrDefaultAsync(x => x.Code == code);

        //        if (order == null)
        //        {
        //            Status = false;
        //            Exception = new Exception($"Không tìm thấy đơn hàng {code}");
        //            return null;
        //        }


        //        var now = DateTime.Now;
        //        const string userId = "SYSTEM"; // TODO: Replace with authenticated user

        //        // Change status to "3" (Đã phê duyệt)
        //        order.Status = "1";
        //        order.UpdateDate = now;
        //        order.UpdateBy = userId;

        //        _dbContext.TblPoHhkReturn.Update(order);

        //        // Add history record
        //        var history = new TblPoHhkHistoryReturn
        //        {
        //            Pkid = Guid.NewGuid().ToString(),
        //            HeaderCode = code,
        //            Status = "1",
        //            Notes = "Đơn trả hàng đã được khởi tạo",
        //            StatusDate = now,
        //            CreateBy = userId,
        //            CreateDate = now
        //        };

        //        _dbContext.TblPoHhkHistoryReturn.Add(history);

        //        await _dbContext.SaveChangesAsync();
        //        await transaction.CommitAsync();

        //        Status = true;
        //        return _mapper.Map<PoHhkReturnCreateUpdateDto>(order);
        //    }
        //    catch (Exception ex)
        //    {
        //        await transaction.RollbackAsync();
        //        Status = false;
        //        Exception = ex;
        //        return null;
        //    }
        //}

        public async Task<IList<PoHhkReturnCreateUpdateDto>> CancelReturns(List<string> codes)
        {
            try
            {
                using var transaction = await _dbContext.Database.BeginTransactionAsync();

                try
                {
                    var cancelledOrders = new List<PoHhkReturnCreateUpdateDto>();
                    var now = DateTime.Now;
                    var userId = "SYSTEM"; // Should be from current user context

                    foreach (var code in codes)
                    {
                        // Find order header
                        var order = await _dbContext.TblPoHhkReturn
                            .FirstOrDefaultAsync(x => x.Code == code);

                        if (order != null)
                        {
                            // Update STATUS to 5 (cancelled)
                            order.Status = "5";
                            order.UpdateDate = now;
                            order.UpdateBy = userId;

                            _dbContext.TblPoHhkReturn.Update(order);

                            // Add history record
                            var history = new TblPoHhkHistoryReturn
                            {
                                Pkid = Guid.NewGuid().ToString(),
                                HeaderCode = code,
                                Status = "5", // Cancelled
                                Notes = "Hủy đơn hàng",
                                StatusDate = now,
                                CreateBy = userId,
                                CreateDate = now
                            };

                            _dbContext.TblPoHhkHistoryReturn.Add(history);

                            // Map to DTO
                            var dto = _mapper.Map<PoHhkReturnCreateUpdateDto>(order);
                            cancelledOrders.Add(dto);
                        }
                    }

                    await _dbContext.SaveChangesAsync();
                    await transaction.CommitAsync();

                    Status = true;
                    return cancelledOrders;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    Status = false;
                    Exception = ex;
                    throw;
                }
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return new List<PoHhkReturnCreateUpdateDto>();
            }
        }

        public async Task<IList<PoHhkReturnCreateUpdateDto>> SubmitReturns(List<string> codes)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var submittedOrders = new List<PoHhkReturnCreateUpdateDto>();
                var now = DateTime.Now;
                const string userId = "SYSTEM"; // TODO: Replace with authenticated user

                foreach (var code in codes)
                {
                    var order = await _dbContext.TblPoHhkReturn
                        .FirstOrDefaultAsync(x => x.Code == code);

                    if (order != null && order.Status == "1") // Only submit if status is "1" (Khởi tạo)
                    {
                        // Change status to "2" (Chờ duyệt)
                        order.Status = "2";
                        order.UpdateDate = now;
                        order.UpdateBy = userId;

                        _dbContext.TblPoHhkReturn.Update(order);

                        // Add history record with STATUS = "2" (Chờ duyệt - same as header)
                        var history = new TblPoHhkHistoryReturn
                        {
                            Pkid = Guid.NewGuid().ToString(),
                            HeaderCode = code,
                            Status = "2", // Chờ duyệt
                            Notes = "Gửi đơn hàng chờ duyệt",
                            StatusDate = now,
                            CreateBy = userId,
                            CreateDate = now
                        };

                        _dbContext.TblPoHhkHistoryReturn.Add(history);

                        // Map to DTO
                        var dto = _mapper.Map<PoHhkReturnCreateUpdateDto>(order);
                        submittedOrders.Add(dto);
                    }
                }

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                Status = true;
                return submittedOrders;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Status = false;
                Exception = ex;
                return new List<PoHhkReturnCreateUpdateDto>();
            }
        }

        /// <summary>
        /// Approve order: change STATUS from 2 (Chờ phê duyệt) to 3 (Đã phê duyệt)
        /// Only for KD (Distributor) accounts
        /// </summary>
        public async Task<PoHhkReturnCreateUpdateDto> ApproveReturn(string code)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                if (string.IsNullOrWhiteSpace(code))
                {
                    Status = false;
                    Exception = new ArgumentException("Mã đơn hàng không được để trống");
                    return null;
                }

                var order = await _dbContext.TblPoHhkReturn
                    .FirstOrDefaultAsync(x => x.Code == code);

                if (order == null)
                {
                    Status = false;
                    Exception = new Exception($"Không tìm thấy đơn hàng {code}");
                    return null;
                }

                if (order.Status != "2") // Only approve if current status is "2" (Chờ phê duyệt)
                {
                    Status = false;
                    Exception = new Exception($"Chỉ có thể phê duyệt đơn hàng có trạng thái 'Chờ phê duyệt'. Trạng thái hiện tại: {order.Status}");
                    return null;
                }

                var now = DateTime.Now;
                const string userId = "SYSTEM"; // TODO: Replace with authenticated user

                // Change status to "3" (Đã phê duyệt)
                order.Status = "3";
                order.UpdateDate = now;
                order.UpdateBy = userId;

                _dbContext.TblPoHhkReturn.Update(order);

                // Add history record
                var history = new TblPoHhkHistoryReturn
                {
                    Pkid = Guid.NewGuid().ToString(),
                    HeaderCode = code,
                    Status = "3", // Đã phê duyệt
                    Notes = "Phê duyệt đơn hàng",
                    StatusDate = now,
                    CreateBy = userId,
                    CreateDate = now
                };

                _dbContext.TblPoHhkHistoryReturn.Add(history);

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                Status = true;
                return _mapper.Map<PoHhkReturnCreateUpdateDto>(order);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Status = false;
                Exception = ex;
                return null;
            }
        }

        /// <summary>
        /// Reject order: change STATUS from 2 (Chờ phê duyệt) to 4 (Từ chối)
        /// Only for KD (Distributor) accounts
        /// </summary>
        public async Task<PoHhkReturnCreateUpdateDto> RejectReturn(string code)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                if (string.IsNullOrWhiteSpace(code))
                {
                    Status = false;
                    Exception = new ArgumentException("Mã đơn hàng không được để trống");
                    return null;
                }

                var order = await _dbContext.TblPoHhkReturn
                    .FirstOrDefaultAsync(x => x.Code == code);

                if (order == null)
                {
                    Status = false;
                    Exception = new Exception($"Không tìm thấy đơn hàng {code}");
                    return null;
                }

                if (order.Status != "2") // Only reject if current status is "2" (Chờ phê duyệt)
                {
                    Status = false;
                    Exception = new Exception($"Chỉ có thể từ chối đơn hàng có trạng thái 'Chờ phê duyệt'. Trạng thái hiện tại: {order.Status}");
                    return null;
                }

                var now = DateTime.Now;
                const string userId = "SYSTEM"; // TODO: Replace with authenticated user

                // Change status to "4" (Từ chối)
                order.Status = "4";
                order.UpdateDate = now;
                order.UpdateBy = userId;

                _dbContext.TblPoHhkReturn.Update(order);

                // Add history record
                var history = new TblPoHhkHistoryReturn
                {
                    Pkid = Guid.NewGuid().ToString(),
                    HeaderCode = code,
                    Status = "4", // Từ chối
                    Notes = "Từ chối đơn hàng",
                    StatusDate = now,
                    CreateBy = userId,
                    CreateDate = now
                };

                _dbContext.TblPoHhkHistoryReturn.Add(history);

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                Status = true;
                return _mapper.Map<PoHhkReturnCreateUpdateDto>(order);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Status = false;
                Exception = ex;
                return null;
            }
        }

        /// <summary>
        /// Confirm received: change STATUS from 3 (Đã phê duyệt) to 5 (Đã xác nhận thực nhận)
        /// Only for KH (Customer) accounts
        /// </summary>
        public async Task<PoHhkReturnCreateUpdateDto> ConfirmReturn(string code)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                if (string.IsNullOrWhiteSpace(code))
                {
                    Status = false;
                    Exception = new ArgumentException("Mã đơn hàng không được để trống");
                    return null;
                }

                var order = await _dbContext.TblPoHhkReturn
                    .FirstOrDefaultAsync(x => x.Code == code);

                if (order == null)
                {
                    Status = false;
                    Exception = new Exception($"Không tìm thấy đơn hàng {code}");
                    return null;
                }

                if (order.Status != "3") // Only confirm if current status is "3" (Đã phê duyệt)
                {
                    Status = false;
                    Exception = new Exception($"Chỉ có thể xác nhận thực nhận đơn hàng có trạng thái 'Đã phê duyệt'. Trạng thái hiện tại: {order.Status}");
                    return null;
                }

                var now = DateTime.Now;
                const string userId = "SYSTEM"; // TODO: Replace with authenticated user

                // Change status to "5" (Đã xác nhận thực nhận)
                order.Status = "6";
                order.UpdateDate = now;
                order.UpdateBy = userId;

                _dbContext.TblPoHhkReturn.Update(order);

                // Add history record
                var history = new TblPoHhkHistoryReturn
                {
                    Pkid = Guid.NewGuid().ToString(),
                    HeaderCode = code,
                    Status = "6", // Đã xác nhận thực nhận
                    Notes = "Xác nhận thực nhận đơn hàng",
                    StatusDate = now,
                    CreateBy = userId,
                    CreateDate = now
                };

                _dbContext.TblPoHhkHistoryReturn.Add(history);

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                Status = true;
                return _mapper.Map<PoHhkReturnCreateUpdateDto>(order);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Status = false;
                Exception = ex;
                return null;
            }
        }

    }
}
