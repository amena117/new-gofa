public class WithdrawUnitRequest
{
    public string Recipient { get; set; } = string.Empty;
    public string RegisteredBy { get; set; } = string.Empty;
    public int VoucherNumber { get; set; }  // ← PROBLEM: int instead of string
}