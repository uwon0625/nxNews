namespace NewsApi.Models;
using System.ComponentModel.DataAnnotations;

public class NewsItem
{
    [Required]
    [Range(1, int.MaxValue)]
    public int Id { get; set; }

    [Required]
    [MinLength(1)]
    public string? Title { get; set; }

    [Required]
    [Url]
    public string? Url { get; set; }
} 