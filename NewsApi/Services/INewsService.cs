using NewsApi.Models;

namespace NewsApi.Services;

public interface INewsService
{
    Task<List<NewsItem>> GetNewStoriesAsync(int size = 0, bool urlOnly = true, bool titleOnly = true, CancellationToken cancellationToken = default);
    Task<NewsItem?> GetItemAsync(int id, bool urlOnly = true, bool titleOnly = true, bool storyOnly = true, CancellationToken cancellationToken = default);
    Task<List<NewsItem>> SearchStoriesByTitleAsync(string searchText, int size = 0, bool urlOnly = true, CancellationToken cancellationToken = default);
    Task<List<NewsItem>> GetStoriesAsync(int fromId, int size, CancellationToken cancellationToken = default);
    Task<int> GetMaxItemIdAsync();
} 