namespace NewsApi.Models;

public class NewsSourceItem
{
    public int Id { get; set; }
    public string? Title { get; set; }
    public string? Type { get; set; }
    public string? By { get; set; }
    public long Time { get; set; }
    public string? Url { get; set; }
    public int Score { get; set; }
    public int[] Kids { get; set; } = Array.Empty<int>();
} 