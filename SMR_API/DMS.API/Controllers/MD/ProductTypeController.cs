using Common;
using DMS.API.AppCode.Attribute;
using DMS.API.AppCode.Enum;
using DMS.API.AppCode.Extensions;
using DMS.BUSINESS.Dtos.MD;
using DMS.BUSINESS.Services.MD;
using DMS.CORE.Entities.MD;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DMS.API.Controllers.MD
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProductTypeController(IProductTypeService service) : ControllerBase
    {
        public readonly IProductTypeService _service = service;



        [HttpGet("Search")]
        [CustomAuthorize(Right = "R2.9.1")]

        public async Task<IActionResult> Search([FromQuery] BaseFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _service.Search(filter);
            var data = result.Data as List<ProductTypeDto>;

            if (_service.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0001", _service);
            }
            return Ok(transferObject);
        }
        [HttpGet("GetAll")]
        [CustomAuthorize(Right = "R2.9.1")]

        public async Task<IActionResult> GetAll([FromQuery] BaseMdFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _service.GetAll(filter);
            if (_service.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0001", _service);
            }
            return Ok(transferObject);
        }
        [HttpPost("Insert")]
        [CustomAuthorize(Right = "R2.9.2")]

        public async Task<IActionResult> Create([FromBody] ProductTypeDto data)
        {
            var transferObject = new TransferObject();



            var result = await _service.Add(data);
            if (_service.Status)
            {
                transferObject.Status = true;
                transferObject.Data = result;
                transferObject.MessageObject.MessageType = MessageType.Success;
                transferObject.GetMessage("0100", _service);
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0101", _service);
            }
            return Ok(transferObject);
        }
        [HttpPut("Update")]
        [CustomAuthorize(Right = "R2.9.3")]

        public async Task<IActionResult> Update([FromBody] ProductTypeDto data)
        {

            var transferObject = new TransferObject();
            await _service.Update(data);
            if (_service.Status)
            {
                transferObject.Status = true;
                transferObject.MessageObject.MessageType = MessageType.Success;
                transferObject.GetMessage("0103", _service);
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0104", _service);
            }
            return Ok(transferObject);
        }
        [HttpDelete("Delete/{id}")]
        public async Task<IActionResult> Delete([FromRoute] string id)
        {
            var transferObject = new TransferObject();
            await _service.Delete(id);
            if (_service.Status)
            {
                transferObject.Status = true;
                transferObject.MessageObject.MessageType = MessageType.Success;
                transferObject.GetMessage("0105", _service);
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0106", _service);
            }
            return Ok(transferObject);
        }
        [HttpPost("ImportExcel")]
        public async Task<IActionResult> ImportExcel(IFormFile file)
        {
            var transferObject = new TransferObject();

            try
            {
                if (file == null || file.Length == 0)
                    throw new ArgumentException("Vui lòng chọn file Excel hợp lệ!");

                var result = await _service.ImportExcel(file);

                transferObject.Status = true;
                transferObject.Data = result;
                transferObject.MessageObject.MessageType = MessageType.Success;
                transferObject.GetMessage("0103", _service);
            }
            catch (ArgumentException ex)
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = ex.Message;
            }
            catch (InvalidOperationException ex)
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = ex.Message;
            }
            catch (Exception ex)
            {
                // Không để exception văng ra -> luôn trả về HTTP 200
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;   
                transferObject.MessageObject.Message = $"Lỗi hệ thống: {ex.Message}";
            }

            // ✅ Luôn trả về HTTP 200 để FE dễ xử lý
            return Ok(transferObject);
        }





    }
}
