using Common;
using DMS.API.AppCode.Attribute;
using DMS.API.AppCode.Enum;
using DMS.API.AppCode.Extensions;
using DMS.BUSINESS.Dtos.MD;
using DMS.BUSINESS.Services.MD;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DMS.API.Controllers.MD
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TransportVehicleController(ITransportVehicleService service) : ControllerBase
    {
        public readonly ITransportVehicleService _service = service;

        [HttpGet("Search")]
        [CustomAuthorize(Right = "R2.5.1")]

        public async Task<IActionResult> Search([FromQuery] BaseFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _service.Search(filter);
            var data = result.Data as List<TransportVehicleDto>;

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
        [CustomAuthorize(Right = "R2.5.1")]

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
        [CustomAuthorize(Right = "R2.5.2")]

        public async Task<IActionResult> Create([FromBody] TransportVehicleCreateUpdateDto data)
        {
            var transferObject = new TransferObject();
            var result = await _service.AddCustom(data);
            if (_service.Status)
            {
                transferObject.Data = result;
                transferObject.Status = true;
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
        [CustomAuthorize(Right = "R2.5.3")]

        public async Task<IActionResult> Update([FromBody] TransportVehicleCreateUpdateDto data)
        {
            var transferObject = new TransferObject();
            await _service.UpdateCustom(data);
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
        [CustomAuthorize(Right = "R2.5.4")]

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
