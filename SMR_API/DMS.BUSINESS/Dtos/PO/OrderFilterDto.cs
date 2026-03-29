namespace DMS.BUSINESS.Dtos.PO
{
    /// <summary>
    /// DTO for filtering orders based on user account type
    /// </summary>
    public class OrderFilterDto
    {
        /// <summary>
        /// User name (from claims, matches CREATE_BY in T_PO_HHK)
        /// </summary>
        public string? UserName { get; set; }

        /// <summary>
        /// Account type: KD (distributor) or KH (customer)
        /// </summary>
        public string? AccountType { get; set; }



        /// <summary>
        /// Optional keyword for search (Code, CustomerName, CustomerCode)
        /// </summary>
        public string? KeyWord { get; set; }
    }
}
