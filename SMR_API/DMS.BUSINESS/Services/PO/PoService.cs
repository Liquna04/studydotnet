using AutoMapper;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.PO;
using DMS.BUSINESS.Dtos.RP;
using DMS.CORE;
using DMS.CORE.Entities.MD;
using DMS.CORE.Entities.PO;
using DMS.CORE.Entities.PO.Attribute;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Services.PO
{
    public interface IPoService : IGenericService<TblPoHhk, PoHhkDto>
    {
        Task<PoHhkDto> CreateOrder(PoHhkCreateDto createDto);
        Task<PoHhkDto> GetOrderByCode(string code);
        Task<IList<PoHhkDto>> GetAllOrders(BaseFilter filter);
        //Task<IList<ReportPoHhkDto>> GetReportOrdersFiltered(ReportFilterDto filterDto);
        Task<IList<PoHhkDto>> GetAllOrdersFiltered(OrderFilterDto filterDto);
        Task<IList<PoHhkDetailDto>> GetOrderDetails(string headerCode);
        Task<IList<PoHhkHistoryDto>> GetOrderHistory(string headerCode);
        Task<IList<PoHhkHistoryDetailDto>> GetOrderHistoryDetail(string headerCode);
        Task<IList<PoHhkDto>> CancelOrders(List<string> orderCodes);
        Task<PoHhkDto> UpdateOrderWithHistory(string orderCode, PoHhkUpdateDto updateDto);
        Task<IList<PoHhkDto>> SubmitOrders(List<string> orderCodes);
        Task<PoHhkDto> ApproveQuantityOrder(string orderCode);
        Task<PoHhkDto> ApproveOrder(string orderCode);
        Task<PoHhkDto> RejectOrder(string orderCode);
        Task<PoHhkDto> ConfirmReceived(string orderCode);
        Task<IList<PoHhkDto>> ConfirmReceiveds(List<string> orderCodes);
    }

    public class PoService : GenericService<TblPoHhk, PoHhkDto>, IPoService
    {
        public PoService(AppDbContext dbContext, IMapper mapper) : base(dbContext, mapper)
        {
        }

        /// <summary>
        /// Create a new order with details and initial history record
        /// </summary>
        public async Task<PoHhkDto> CreateOrder(PoHhkCreateDto createDto)
        {
            try
            {
                // Validate required items
                if (createDto.Items == null || !createDto.Items.Any())
                {
                    Status = false;
                    Exception = new Exception("Vui lòng thêm ít nhất một mặt hàng!");
                    return null;
                }

                // Validate that items have valid MaterialCode and UnitCode
                var validItems = createDto.Items
                    .Where(item => !string.IsNullOrWhiteSpace(item.MaterialCode)
                        && !string.IsNullOrWhiteSpace(item.UnitCode))
                    .ToList();

                if (!validItems.Any())
                {
                    Status = false;
                    Exception = new Exception("Vui lòng đảm bảo tất cả mặt hàng có mã vật liệu và đơn vị!");
                    return null;
                }

                using var transaction = await _dbContext.Database.BeginTransactionAsync();

                try
                {
                    static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

                    // Generate unique order code
                    var orderCode = await GenerateOrderCode();
                    var now = DateTime.Now;

                    // 1. Create header record (T_PO_HHK)
                    // Ensure DeliveryDate is never null (DB column is NOT NULL)
                    var effectiveDeliveryDate = createDto.DeliveryDate
                        ?? createDto.ReceiptDate
                        ?? createDto.OrderDate
                        ?? now;

                    // Resolve transport type: prefer payload; if missing, infer from vehicle
                    var transportTypeCode = Clean(createDto.TransportType);
                    TblMdTransportType? transportType = null;
                    if (string.IsNullOrEmpty(transportTypeCode) && !string.IsNullOrEmpty(createDto.VehicleCode))
                    {
                        var vehicle = await _dbContext.TblMdTransportVehicle
                            .AsNoTracking()
                            .FirstOrDefaultAsync(v => v.Code == createDto.VehicleCode);
                        transportTypeCode = Clean(vehicle?.Type);
                        if (!string.IsNullOrEmpty(transportTypeCode))
                        {
                            transportType = await _dbContext.TblMdTransportType
                                .AsNoTracking()
                                .FirstOrDefaultAsync(t => t.Code == transportTypeCode);
                        }
                    }
                    else if (!string.IsNullOrEmpty(transportTypeCode))
                    {
                        transportType = await _dbContext.TblMdTransportType
                            .AsNoTracking()
                            .FirstOrDefaultAsync(t => t.Code == transportTypeCode);
                    }

                    var header = new TblPoHhk
                    {
                        Code = orderCode,
                        PoType = Clean(createDto.PoType),
                        TotalPrice = createDto.TotalPrice,
                        CustomerCode = Clean(createDto.CustomerCode),
                        CustomerName = Clean(createDto.CustomerName),
                        OrderDate = createDto.OrderDate ?? now,
                        DeliveryDate = effectiveDeliveryDate,
                        ReceiptDate = createDto.ReceiptDate,
                        TransportType = transportTypeCode,
                        TransportMethod = Clean(createDto.TransportMethod),
                        VehicleCode = Clean(createDto.VehicleCode),
                        VehicleInfo = Clean(createDto.VehicleInfo) ?? string.Empty, // Ensure NOT NULL
                        Driver = Clean(createDto.Driver),
                        StorageCode = Clean(createDto.StorageCode),
                        StorageName = Clean(createDto.StorageName),
                        Representative = Clean(createDto.Representative),
                        Email = Clean(createDto.Email),
                        Phone = Clean(createDto.Phone),
                        Note = Clean(createDto.Note),
                        Status = "1", // Khởi tạo
                        StoreCode = Clean(createDto.StoreCode),

                        // Audit fields

                    };

                    _dbContext.TblPoHhk.Add(header);
                    await _dbContext.SaveChangesAsync();

                    // 2. Create detail records (T_PO_HHK_DETAIL)
                    if (createDto.Items != null && createDto.Items.Any())
                    {
                        var indexedItems = createDto.Items.Select((it, i) => new { it, idx = i + 1 });
                        foreach (var entry in indexedItems)
                        {
                            var item = entry.it;
                            var matCode = Clean(item.MaterialCode);
                            var unitCode = Clean(item.UnitCode);
                            var BasicUnit = Clean(item.BasicUnit);


                            // Skip item if MaterialCode or UnitCode is null/empty (optional items)
                            if (string.IsNullOrEmpty(matCode) || string.IsNullOrEmpty(unitCode))
                            {
                                continue;
                            }

                            var numberItem = item.NumberItem ?? entry.idx;

                            // If a detail with the same (HeaderCode, MaterialCode) already exists, update its quantity
                            var existingDetail = await _dbContext.TblPoHhkDetail
                                .AsTracking()
                                .FirstOrDefaultAsync(d => d.HeaderCode == orderCode && d.MaterialCode == matCode);

                            if (existingDetail != null)
                            {
                                // Set exact quantity from frontend for this item
                                existingDetail.Quantity = item.Quantity;
                                existingDetail.ApproveQuantity = item.Quantity;
                                existingDetail.UnitCode = unitCode;
                                existingDetail.BasicUnit = BasicUnit;
                                existingDetail.Price = item.Price;
                                existingDetail.NumberItem = numberItem;
                            }
                            else
                            {
                                var detail = new TblPoHhkDetail
                                {
                                    HeaderCode = orderCode,
                                    MaterialCode = matCode,
                                    NumberItem = numberItem,
                                    Quantity = item.Quantity,
                                    ApproveQuantity = item.Quantity, // Default 0
                                    RealQuantity = 0,    // Default 0
                                    UnitCode = unitCode,
                                    BasicUnit = BasicUnit,
                                    Price = item.Price,

                                };

                                _dbContext.TblPoHhkDetail.Add(detail);
                            }
                        }

                        await _dbContext.SaveChangesAsync();
                    }

                    // 3. Create initial history record (T_PO_HHK_HISTORY)
                    var history = new TblPoHhkHistory
                    {
                        Pkid = Guid.NewGuid().ToString(),
                        HeaderCode = orderCode,
                        Status = "1", // Khởi tạo
                        Notes = "Đơn hàng được tạo mới",
                        StatusDate = now,


                    };

                    _dbContext.TblPoHhkHistory.Add(history);
                    await _dbContext.SaveChangesAsync();

                    await transaction.CommitAsync();

                    // Return created order
                    return _mapper.Map<PoHhkDto>(header);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw new Exception($"Lỗi khi tạo đơn hàng: {ex.Message}", ex);
                }
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

        /// <summary>
        /// Generate unique order code (format: PO + YYYYMMDD + sequence)
        /// </summary>
        private async Task<string> GenerateOrderCode()
        {
            var datePrefix = DateTime.Now.ToString("yyyyMMdd");
            var prefix = $"PO{datePrefix}";

            // Get max sequence for today
            var lastCode = await _dbContext.TblPoHhk
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

        /// <summary>
        /// Get order by code
        /// </summary>
        public async Task<PoHhkDto> GetOrderByCode(string code)
        {
            try
            {
                var order = await _dbContext.TblPoHhk
                    .FirstOrDefaultAsync(x => x.Code == code);

                return _mapper.Map<PoHhkDto>(order);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

        /// <summary>
        /// Get all orders with filter
        /// </summary>
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

        /// <summary>
        /// Get order details by header code
        /// </summary>
        public async Task<IList<PoHhkDetailDto>> GetOrderDetails(string headerCode)
        {
            try
            {
                var details = await _dbContext.TblPoHhkDetail
                    .Where(x => x.HeaderCode == headerCode)
                    .OrderBy(x => x.NumberItem)
                    .ToListAsync();

                return _mapper.Map<IList<PoHhkDetailDto>>(details);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return null;
            }
        }

        /// <summary>
        /// Get order history by header code
        /// </summary>
        public async Task<IList<PoHhkHistoryDto>> GetOrderHistory(string headerCode)
        {
            try
            {
                var history = await _dbContext.TblPoHhkHistory
                    .Where(x => x.HeaderCode == headerCode)
                    .OrderByDescending(x => x.StatusDate)
                    .ToListAsync();

                return _mapper.Map<IList<PoHhkHistoryDto>>(history);
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
                var query = _dbContext.TblPoHhk.AsQueryable();

                if (!string.IsNullOrWhiteSpace(filter.KeyWord))
                {
                    query = query.Where(x =>
                        x.Code.Contains(filter.KeyWord) ||
                        x.CustomerName.Contains(filter.KeyWord) ||
                        x.CustomerCode.Contains(filter.KeyWord));
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

        /// <summary>
        /// Update an existing order with header and detail items
        /// - Updates T_PO_HHK header (STATUS remains unchanged, stays at initial value "1")
        /// - Updates T_PO_HHK_DETAIL items
        /// - Adds new history record in T_PO_HHK_HISTORY with STATUS = 0 ("Chỉnh sửa thông tin đơn hàng")
        /// </summary>
        public async Task<PoHhkDto> UpdateOrderWithHistory(string orderCode, PoHhkUpdateDto updateDto)
        {
            try
            {
                using var transaction = await _dbContext.Database.BeginTransactionAsync();

                try
                {
                    var now = DateTime.Now;
                    var userId = "SYSTEM"; // Should be from current user context

                    // 1. Find and update header record (T_PO_HHK)
                    var header = await _dbContext.TblPoHhk
                        .FirstOrDefaultAsync(x => x.Code == orderCode);

                    if (header == null)
                    {
                        Status = false;
                        Exception = new Exception($"Không tìm thấy đơn hàng: {orderCode}");
                        return null;
                    }

                    // Update header fields (but NOT STATUS - keep STATUS = 1)
                    if (!string.IsNullOrEmpty(updateDto.PoType))
                        header.PoType = updateDto.PoType;
                    header.TotalPrice = updateDto.TotalPrice;
                    if (updateDto.ReceiptDate.HasValue)
                        header.ReceiptDate = updateDto.ReceiptDate;
                    if (!string.IsNullOrEmpty(updateDto.TransportType))
                        header.TransportType = updateDto.TransportType;
                    if (!string.IsNullOrEmpty(updateDto.TransportMethod))
                        header.TransportMethod = updateDto.TransportMethod;
                    if (!string.IsNullOrEmpty(updateDto.VehicleCode))
                        header.VehicleCode = updateDto.VehicleCode;
                    if (!string.IsNullOrEmpty(updateDto.VehicleInfo))
                        header.VehicleInfo = updateDto.VehicleInfo;
                    if (!string.IsNullOrEmpty(updateDto.Driver))
                        header.Driver = updateDto.Driver;
                    if (!string.IsNullOrEmpty(updateDto.StorageCode))
                        header.StorageCode = updateDto.StorageCode;
                    if (!string.IsNullOrEmpty(updateDto.StorageName))
                        header.StorageName = updateDto.StorageName;
                    if (!string.IsNullOrEmpty(updateDto.Representative))
                        header.Representative = updateDto.Representative;
                    if (!string.IsNullOrEmpty(updateDto.Email))
                        header.Email = updateDto.Email;
                    if (!string.IsNullOrEmpty(updateDto.Phone))
                        header.Phone = updateDto.Phone;
                    if (!string.IsNullOrEmpty(updateDto.Note))
                        header.Note = updateDto.Note;

                    // Update audit fields
                    header.UpdateDate = now;
                    header.UpdateBy = userId;

                    _dbContext.TblPoHhk.Update(header);
                    await _dbContext.SaveChangesAsync();

                    // 2. Update detail records (T_PO_HHK_DETAIL)
                    if (updateDto.Items != null && updateDto.Items.Count > 0)
                    {
                        // Remove existing details
                        var existingDetails = await _dbContext.TblPoHhkDetail
                            .Where(x => x.HeaderCode == orderCode)
                            .ToListAsync();
                        _dbContext.TblPoHhkDetail.RemoveRange(existingDetails);
                        await _dbContext.SaveChangesAsync();

                        // Add new details
                        foreach (var item in updateDto.Items)
                        {
                            var detailRecord = new TblPoHhkDetail
                            {
                                HeaderCode = orderCode,
                                MaterialCode = item?.MaterialCode ?? string.Empty,
                                NumberItem = item?.NumberItem ?? 1,
                                Quantity = item?.Quantity ?? 0,
                                ApproveQuantity = item?.ApproveQuantity ?? 0,
                                UnitCode = item?.UnitCode ?? string.Empty,
                                BasicUnit = item?.BasicUnit ?? string.Empty,
                                Price = item?.Price ?? 0,
                                CreateBy = userId,
                                CreateDate = now
                            };
                            _dbContext.TblPoHhkDetail.Add(detailRecord);
                        }
                        await _dbContext.SaveChangesAsync();
                    }

                    // 3. Add history record with STATUS = 0 ("Chỉnh sửa thông tin")
                    var history = new TblPoHhkHistory
                    {
                        Pkid = Guid.NewGuid().ToString(),
                        HeaderCode = orderCode,
                        Status = "0", // Status = 0 means "Chỉnh sửa thông tin đơn hàng"
                        Notes = "Chỉnh sửa thông tin đơn hàng",
                        StatusDate = now,
                        CreateBy = userId,
                        CreateDate = now
                    };

                    _dbContext.TblPoHhkHistory.Add(history);
                    await _dbContext.SaveChangesAsync();

                    await transaction.CommitAsync();

                    Status = true;
                    return _mapper.Map<PoHhkDto>(header);
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
                return null;
            }
        }

        /// <summary>
        /// Cancel one or multiple orders
        /// - Set STATUS = -1 in T_PO_HHK
        /// - Add new history record in T_PO_HHK_HISTORY with STATUS = -1
        /// </summary>
        public async Task<IList<PoHhkDto>> CancelOrders(List<string> orderCodes)
        {
            try
            {
                using var transaction = await _dbContext.Database.BeginTransactionAsync();

                try
                {
                    var cancelledOrders = new List<PoHhkDto>();
                    var now = DateTime.Now;
                    var userId = "SYSTEM"; // Should be from current user context

                    foreach (var orderCode in orderCodes)
                    {
                        // Find order header
                        var order = await _dbContext.TblPoHhk
                            .FirstOrDefaultAsync(x => x.Code == orderCode);

                        if (order != null)
                        {
                            // Update STATUS to -1 (cancelled)
                            order.Status = "-1";
                            order.UpdateDate = now;
                            order.UpdateBy = userId;

                            _dbContext.TblPoHhk.Update(order);

                            // Add history record
                            var history = new TblPoHhkHistory
                            {
                                Pkid = Guid.NewGuid().ToString(),
                                HeaderCode = orderCode,
                                Status = "-1", // Cancelled
                                Notes = "Hủy đơn hàng",
                                StatusDate = now,
                                CreateBy = userId,
                                CreateDate = now
                            };

                            _dbContext.TblPoHhkHistory.Add(history);

                            // Map to DTO
                            var dto = _mapper.Map<PoHhkDto>(order);
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
                return new List<PoHhkDto>();
            }
        }

        
        /// <summary>
        /// Get all orders filtered by account type (KD/KH/KT)
        /// KD (Distributor): Can see own orders + KH orders with STATUS > 1
        /// KH (Customer): Can see only own orders
        /// KT (Accountant): Can see OUT_PROVINCE orders with STATUS = -3 or higher
        /// </summary>
        public async Task<IList<PoHhkDto>> GetAllOrdersFiltered(OrderFilterDto filterDto)
        {
            try
            {
                var query = _dbContext.TblPoHhk.AsQueryable();

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
                        (x.CreateBy != filterDto.UserName && x.Status != "1" && x.Status != "-1")
                    );
                }
                else if (filterDto.AccountType == "CH")
                {
                    query = query.Where(x =>
                        x.CreateBy == filterDto.UserName);
                }
                // *** KHỐI LOGIC MỚI CHO KT ***
                else if (filterDto.AccountType == "KT")
                {
                    // KT account: Show only OUT_PROVINCE orders that are in quantity-approved state ("-3") or beyond
                    query = query.Where(x =>
                        x.PoType == "OUT_PROVINCE" &&
                        (x.Status == "-3" || x.Status == "3" || x.Status == "4" || x.Status == "5" || x.Status == "-1")
                    );
                }
                else if (filterDto.AccountType == "KH")
                {
                    // 1. Tìm CustomerCode từ bảng mapping TblAdAccountCustomer
                    var mapAccount = await _dbContext.TblAdAccountCustomer
                                        .AsNoTracking()
                                        .FirstOrDefaultAsync(x => x.UserName == filterDto.UserName);

                    // 2. Nếu tìm thấy mapping hợp lệ
                    if (mapAccount != null && !string.IsNullOrEmpty(mapAccount.CustomerCode))
                    {
                        // Lọc theo CustomerCode (Sẽ lấy được cả đơn KH tự tạo VÀ đơn CH tạo hộ)
                        string myCustomerCode = mapAccount.CustomerCode;
                        query = query.Where(x => x.CustomerCode == myCustomerCode);
                    }
                    else
                    {
                        // Nếu user KH chưa được gán mã khách hàng -> Không trả về dữ liệu nào
                        return new List<PoHhkDto>();
                    }
                }
                // If no account type specified, or unknown type, return empty (safety measure)
                else
                {
                    query = query.Where(x => false);
                }


                query = query.OrderByDescending(x => x.CreateDate);

                var result = await query.ToListAsync();
                return _mapper.Map<IList<PoHhkDto>>(result);
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return new List<PoHhkDto>();
            }
        }
        /// <summary>
        /// Get order history by header code with user information join
        /// Returns history records with user FULL_NAME
        /// </summary>
        public async Task<IList<PoHhkHistoryDetailDto>> GetOrderHistoryDetail(string headerCode)
        {
            try
            {
                var history = await _dbContext.TblPoHhkHistory
                    .Where(x => x.HeaderCode == headerCode)
                    .OrderByDescending(x => x.StatusDate)
                    .ToListAsync();

                var result = new List<PoHhkHistoryDetailDto>();

                foreach (var h in history)
                {
                    var user = await _dbContext.TblAdAccount
                        .AsNoTracking()
                        .FirstOrDefaultAsync(u => u.UserName == h.CreateBy);

                    result.Add(new PoHhkHistoryDetailDto
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
                return new List<PoHhkHistoryDetailDto>();
            }
        }

        /// <summary>
        /// Submit orders: change STATUS from 1 (Khởi tạo) to 2 (Chờ duyệt)
        /// </summary>
        public async Task<IList<PoHhkDto>> SubmitOrders(List<string> orderCodes)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var submittedOrders = new List<PoHhkDto>();
                var now = DateTime.Now;
                const string userId = "SYSTEM"; // TODO: Replace with authenticated user

                foreach (var orderCode in orderCodes)
                {
                    var order = await _dbContext.TblPoHhk
                        .FirstOrDefaultAsync(x => x.Code == orderCode);

                    if (order != null && order.Status == "1") // Only submit if status is "1" (Khởi tạo)
                    {
                        // Change status to "2" (Chờ duyệt)
                        order.Status = "2";
                        order.UpdateDate = now;
                        order.UpdateBy = userId;

                        _dbContext.TblPoHhk.Update(order);

                        // Add history record with STATUS = "2" (Chờ duyệt - same as header)
                        var history = new TblPoHhkHistory
                        {
                            Pkid = Guid.NewGuid().ToString(),
                            HeaderCode = orderCode,
                            Status = "2", // Chờ duyệt
                            Notes = "Gửi đơn hàng chờ duyệt",
                            StatusDate = now,
                            CreateBy = userId,
                            CreateDate = now
                        };

                        _dbContext.TblPoHhkHistory.Add(history);

                        // Map to DTO
                        var dto = _mapper.Map<PoHhkDto>(order);
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
                return new List<PoHhkDto>();
            }
        }

        /// <summary>
        /// Approve order quantity: change STATUS from 2 (Chờ phê duyệt) to -3 (Đã phê duyệt số lượng)
        /// Used by KD for OUT_PROVINCE orders.
        /// </summary>
        public async Task<PoHhkDto> ApproveQuantityOrder(string orderCode)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                if (string.IsNullOrWhiteSpace(orderCode))
                {
                    Status = false;
                    Exception = new ArgumentException("Mã đơn hàng không được để trống");
                    return null;
                }

                var order = await _dbContext.TblPoHhk
                    .FirstOrDefaultAsync(x => x.Code == orderCode);

                if (order == null)
                {
                    Status = false;
                    Exception = new Exception($"Không tìm thấy đơn hàng {orderCode}");
                    return null;
                }

                // Chỉ cho phép khi trạng thái là "2" (Chờ phê duyệt)
                if (order.Status != "2")
                {
                    Status = false;
                    Exception = new Exception($"Chỉ có thể phê duyệt số lượng cho đơn hàng có trạng thái 'Chờ phê duyệt'. Trạng thái hiện tại: {order.Status}");
                    return null;
                }

                // (Optional but recommended) Check if PoType is OUT_PROVINCE
                if (order.PoType != "OUT_PROVINCE")
                {
                    Status = false;
                    Exception = new Exception("Chỉ đơn hàng ngoại tỉnh mới cần phê duyệt số lượng.");
                    return null;
                }

                var now = DateTime.Now;
                const string userId = "SYSTEM"; // TODO: Nên thay bằng user đang đăng nhập

                // Change status to "-3" (Đã phê duyệt số lượng)
                order.Status = "-3";
                order.UpdateDate = now;
                order.UpdateBy = userId;

                _dbContext.TblPoHhk.Update(order);

                // Add history record
                var history = new TblPoHhkHistory
                {
                    Pkid = Guid.NewGuid().ToString(),
                    HeaderCode = orderCode,
                    Status = "-3", // Đã phê duyệt số lượng
                    Notes = "Phê duyệt số lượng",
                    StatusDate = now,
                    CreateBy = userId,
                    CreateDate = now
                };

                _dbContext.TblPoHhkHistory.Add(history);

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                Status = true;
                return _mapper.Map<PoHhkDto>(order);
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
        /// Approve order: 
        /// - KD: change STATUS from 2 (Chờ phê duyệt) to 3 (Đã phê duyệt) - (For IN_PROVINCE)
        /// - KT: change STATUS from -3 (Đã phê duyệt số lượng) to 3 (Đã phê duyệt) - (For OUT_PROVINCE)
        /// </summary>
        public async Task<PoHhkDto> ApproveOrder(string orderCode)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                if (string.IsNullOrWhiteSpace(orderCode))
                {
                    Status = false;
                    Exception = new ArgumentException("Mã đơn hàng không được để trống");
                    return null;
                }

                var order = await _dbContext.TblPoHhk
                    .FirstOrDefaultAsync(x => x.Code == orderCode);

                if (order == null)
                {
                    Status = false;
                    Exception = new Exception($"Không tìm thấy đơn hàng {orderCode}");
                    return null;
                }

                // *** ĐÂY LÀ THAY ĐỔI CHÍNH ***
                // Chỉ phê duyệt nếu trạng thái là "2" (Chờ duyệt) HOẶC "-3" (Đã duyệt số lượng)
                if (order.Status != "2" && order.Status != "-3")
                {
                    Status = false;
                    Exception = new Exception($"Đơn hàng không ở trạng thái 'Chờ phê duyệt' ('2') hoặc 'Đã phê duyệt số lượng' ('-3'). Trạng thái hiện tại: {order.Status}");
                    return null;
                }

                var now = DateTime.Now;
                const string userId = "SYSTEM"; // TODO: Replace with authenticated user

                // Change status to "3" (Đã phê duyệt)
                order.Status = "3";
                order.UpdateDate = now;
                order.UpdateBy = userId;

                _dbContext.TblPoHhk.Update(order);

                // Add history record
                var history = new TblPoHhkHistory
                {
                    Pkid = Guid.NewGuid().ToString(),
                    HeaderCode = orderCode,
                    Status = "3", // Đã phê duyệt
                    Notes = "Phê duyệt đơn hàng",
                    StatusDate = now,
                    CreateBy = userId,
                    CreateDate = now
                };

                _dbContext.TblPoHhkHistory.Add(history);

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                Status = true;
                return _mapper.Map<PoHhkDto>(order);
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
        /// Reject order: 
        /// - KD: change STATUS from 2 (Chờ phê duyệt) to 4 (Từ chối)
        /// - KT: change STATUS from -3 (Đã phê duyệt số lượng) to 4 (Từ chối)
        /// </summary>
        public async Task<PoHhkDto> RejectOrder(string orderCode)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                if (string.IsNullOrWhiteSpace(orderCode))
                {
                    Status = false;
                    Exception = new ArgumentException("Mã đơn hàng không được để trống");
                    return null;
                }

                var order = await _dbContext.TblPoHhk
                    .FirstOrDefaultAsync(x => x.Code == orderCode);

                if (order == null)
                {
                    Status = false;
                    Exception = new Exception($"Không tìm thấy đơn hàng {orderCode}");
                    return null;
                }

                // *** ĐÂY LÀ THAY ĐỔI CHÍNH ***
                // Chỉ từ chối nếu trạng thái là "2" (Chờ duyệt) HOẶC "-3" (Đã duyệt số lượng)
                if (order.Status != "2" && order.Status != "-3")
                {
                    Status = false;
                    Exception = new Exception($"Đơn hàng không ở trạng thái 'Chờ phê duyệt' ('2') hoặc 'Đã phê duyệt số lượng' ('-3'). Trạng thái hiện tại: {order.Status}");
                    return null;
                }

                var now = DateTime.Now;
                const string userId = "SYSTEM"; // TODO: Replace with authenticated user

                // Change status to "4" (Từ chối)
                order.Status = "4";
                order.UpdateDate = now;
                order.UpdateBy = userId;

                _dbContext.TblPoHhk.Update(order);

                // Add history record
                var history = new TblPoHhkHistory
                {
                    Pkid = Guid.NewGuid().ToString(),
                    HeaderCode = orderCode,
                    Status = "4", // Từ chối
                    Notes = "Từ chối đơn hàng",
                    StatusDate = now,
                    CreateBy = userId,
                    CreateDate = now
                };

                _dbContext.TblPoHhkHistory.Add(history);

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                Status = true;
                return _mapper.Map<PoHhkDto>(order);
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
        public async Task<PoHhkDto> ConfirmReceived(string orderCode)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                if (string.IsNullOrWhiteSpace(orderCode))
                {
                    Status = false;
                    Exception = new ArgumentException("Mã đơn hàng không được để trống");
                    return null;
                }

                var order = await _dbContext.TblPoHhk
                    .FirstOrDefaultAsync(x => x.Code == orderCode);

                if (order == null)
                {
                    Status = false;
                    Exception = new Exception($"Không tìm thấy đơn hàng {orderCode}");
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
                order.Status = "5";
                order.UpdateDate = now;
                order.UpdateBy = userId;

                _dbContext.TblPoHhk.Update(order);

                // Add history record
                var history = new TblPoHhkHistory
                {
                    Pkid = Guid.NewGuid().ToString(),
                    HeaderCode = orderCode,
                    Status = "5", // Đã xác nhận thực nhận
                    Notes = "Xác nhận thực nhận đơn hàng",
                    StatusDate = now,
                    CreateBy = userId,
                    CreateDate = now
                };

                _dbContext.TblPoHhkHistory.Add(history);

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                Status = true;
                return _mapper.Map<PoHhkDto>(order);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Status = false;
                Exception = ex;
                return null;
            }
        }
        public async Task<IList<PoHhkDto>> ConfirmReceiveds(List<string> orderCodes)
        {
            try
            {
                using var transaction = await _dbContext.Database.BeginTransactionAsync();

                try
                {
                    var cancelledOrders = new List<PoHhkDto>();
                    var now = DateTime.Now;
                    var userId = "SYSTEM"; // Should be from current user context

                    foreach (var orderCode in orderCodes)
                    {
                        // Find order header
                        var order = await _dbContext.TblPoHhk
                            .FirstOrDefaultAsync(x => x.Code == orderCode);
                        if (order.Status != "3") // Only confirm if current status is "3" (Đã phê duyệt)
                        {
                            Status = false;
                            Exception = new Exception($"Chỉ có thể xác nhận thực nhận đơn hàng có trạng thái 'Đã phê duyệt'. Trạng thái hiện tại: {order.Status}");
                            return null;
                        }
                        if (order != null)
                        {

                            order.Status = "5";
                            order.UpdateDate = now;
                            order.UpdateBy = userId;

                            _dbContext.TblPoHhk.Update(order);

                            // Add history record
                            var history = new TblPoHhkHistory
                            {
                                Pkid = Guid.NewGuid().ToString(),
                                HeaderCode = orderCode,
                                Status = "5", // Cancelled
                                Notes = "Xác nhận thực nhận đơn hàng",
                                StatusDate = now,
                                CreateBy = userId,
                                CreateDate = now
                            };

                            _dbContext.TblPoHhkHistory.Add(history);

                            // Map to DTO
                            var dto = _mapper.Map<PoHhkDto>(order);
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
                return new List<PoHhkDto>();
            }
        }

    }
}

