using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using NewsApi.Models;
using System.Net.Http.Json;
using System.Threading;

namespace NewsApi.Services;

public class HackerNewsService : INewsService
{
    private const string CONFIG_BASE_URL = "HackerNews:BaseUrl";
    private const string CONFIG_CACHE_DURATION = "HackerNews:CacheDurationMinutes";
    private const string CONFIG_MAX_PAGE_SIZE = "HackerNews:MaxPageSize";
    private const string CONFIG_STORIES_CACHE_KEY = "HackerNews:StoriesCacheKey";
    private const string CONFIG_STORIES_CACHE_DURATION = "HackerNews:StoriesCacheDurationHours";
    private const string CONFIG_API_TIMEOUT = "HackerNews:ApiTimeout";
    private const string CONFIG_RETRY_COUNT = "HackerNews:RetryCount";
    private const string CONFIG_RETRY_WAIT = "HackerNews:RetryWaitSeconds";
    private const string CONFIG_RATE_LIMIT = "HackerNews:RateLimit:PermitLimit";
    private const string CONFIG_RATE_WINDOW = "HackerNews:RateLimit:WindowSeconds";

    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly ILogger<HackerNewsService> _logger;
    private readonly int _cacheDurationMinutes;
    private readonly int _maxPageSize;
    private readonly string _storiesCacheKey;
    private readonly TimeSpan _storiesCacheDuration;
    private readonly int _retryCount;
    private readonly int _retryWaitSeconds;
    private readonly SemaphoreSlim _rateLimiter;
    private readonly int _permitLimit;
    private readonly int _windowSeconds;

    public HackerNewsService(
        HttpClient httpClient,
        IConfiguration configuration,
        IMemoryCache cache,
        ILogger<HackerNewsService> logger)
    {
        var baseUrl = configuration["HackerNews:BaseUrl"]
            ?? throw new ArgumentNullException($"{CONFIG_BASE_URL} not configured");

        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri(baseUrl);
        _cache = cache;
        _logger = logger;
        
        _cacheDurationMinutes = configuration.GetValue<int>("HackerNews:CacheDurationMinutes", 5);
        _maxPageSize = configuration.GetValue<int>("HackerNews:MaxPageSize", 20);
        _storiesCacheKey = configuration["HackerNews:StoriesCacheKey"] ?? "cached-stories";
        _storiesCacheDuration = TimeSpan.FromHours(
            configuration.GetValue<int>("HackerNews:StoriesCacheDurationHours", 1));

        var timeout = configuration.GetValue<TimeSpan>(CONFIG_API_TIMEOUT, TimeSpan.FromSeconds(30));
        _httpClient.Timeout = timeout;

        _retryCount = configuration.GetValue<int>(CONFIG_RETRY_COUNT, 3);
        _retryWaitSeconds = configuration.GetValue<int>(CONFIG_RETRY_WAIT, 2);

        _permitLimit = configuration.GetValue<int>(CONFIG_RATE_LIMIT, 100);
        _windowSeconds = configuration.GetValue<int>(CONFIG_RATE_WINDOW, 60);
        _rateLimiter = new SemaphoreSlim(_permitLimit, _permitLimit);
    }

    private async Task<Dictionary<int, NewsItem>> GetCachedStoriesAsync(CancellationToken cancellationToken = default)
    {
        var cacheEntry = await _cache.GetOrCreateAsync(_storiesCacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = _storiesCacheDuration;
            return Task.FromResult(new Dictionary<int, NewsItem>());
        });
        return cacheEntry!;
    }

    private async Task AddToStoriesCacheAsync(NewsItem story)
    {
        var stories = await GetCachedStoriesAsync();
        if (!stories.ContainsKey(story.Id))
        {
            stories[story.Id] = story;
            _logger.LogInformation("Added story {Id} to cache", story.Id);
        }
    }

    private async Task<T?> ExecuteWithRetryAsync<T>(Func<Task<T?>> action, string operationName, CancellationToken cancellationToken)
    {
        for (int i = 0; i <= _retryCount; i++)
        {
            try
            {
                await _rateLimiter.WaitAsync(cancellationToken);
                try
                {
                    return await action();
                }
                catch (HttpRequestException ex) when (ex.InnerException is TimeoutException)
                {
                    _logger.LogWarning(ex, 
                        "Attempt {Attempt} of {MaxAttempts} failed for {Operation}. Retrying in {Delay}s...", 
                        i + 1, _retryCount + 1, operationName, _retryWaitSeconds);
                    if (i < _retryCount)
                    {
                        await Task.Delay(TimeSpan.FromSeconds(_retryWaitSeconds), cancellationToken);
                        continue;
                    }
                    return default;
                }
                finally
                {
                    _ = Task.Delay(TimeSpan.FromSeconds(_windowSeconds / _permitLimit), cancellationToken)
                        .ContinueWith(_ => _rateLimiter.Release(), cancellationToken);
                }
            }
            catch (Exception ex) when (i < _retryCount)
            {
                _logger.LogWarning(ex, 
                    "Attempt {Attempt} of {MaxAttempts} failed for {Operation}. Retrying in {Delay}s...", 
                    i + 1, _retryCount + 1, operationName, _retryWaitSeconds);
                await Task.Delay(TimeSpan.FromSeconds(_retryWaitSeconds), cancellationToken);
            }
        }

        return default;
    }

    public async Task<NewsItem?> GetItemAsync(int id, bool urlOnly = true, bool titleOnly = true, bool storyOnly = true, CancellationToken cancellationToken = default)
    {
        var stories = await GetCachedStoriesAsync(cancellationToken);
        if (stories.TryGetValue(id, out var cachedStory))
        {
            return cachedStory;
        }

        string cacheKey = $"item-{id}";
        var story = await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            _logger.LogInformation("Fetching item {Id} from API", id);
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_cacheDurationMinutes);

            var data = await ExecuteWithRetryAsync(
                async () => await _httpClient.GetFromJsonAsync<NewsSourceItem>($"item/{id}.json", cancellationToken),
                $"GetItem-{id}",
                cancellationToken
            );

            if (data == null || (storyOnly && data.Type != "story"))
            {
                return null;
            }
            if (urlOnly && string.IsNullOrEmpty(data.Url))
            {
                return null;
            }
            if (titleOnly && string.IsNullOrEmpty(data.Title))
            {
                return null;
            }
            var newsItem = new NewsItem { Id = data.Id, Title = data.Title, Url = data.Url };
            await AddToStoriesCacheAsync(newsItem);
            return newsItem;
        });

        return story;
    }

    public async Task<List<NewsItem>> SearchStoriesByTitleAsync(string searchText, int size = 0, bool urlOnly = true, CancellationToken cancellationToken = default)
    {
        searchText = searchText.Trim();
        var targetSize = size <= 0 ? _maxPageSize : Math.Min(size, _maxPageSize);
        var maxId = await GetMaxItemIdAsync();
        var matchingStories = new List<NewsItem>();
        var storiesChecked = 0;

        _logger.LogInformation("Starting search for text: '{SearchText}' from ID {MaxId}", searchText, maxId);

        // First check cached stories
        var cachedStories = await GetCachedStoriesAsync();
        var cachedMatches = cachedStories.Values
            .Where(s => s.Title!.Contains(searchText, StringComparison.InvariantCultureIgnoreCase))
            .OrderByDescending(s => s.Id)
            .ToList();

        matchingStories.AddRange(cachedMatches);
        _logger.LogInformation("Found {Count} matches in cache", cachedMatches.Count);

        // If we don't have enough matches from cache, search through API
        if (matchingStories.Count < targetSize)
        {
            _logger.LogInformation("Not enough matches in cache ({Count}/{Target}), searching API", 
                matchingStories.Count, targetSize);

            var currentId = maxId;

            while (currentId > 0 && matchingStories.Count < targetSize)
            {
                if (!cachedStories.ContainsKey(currentId))
                {
                    var story = await GetItemAsync(currentId, urlOnly, true, true);
                    if (story != null && story.Title!.Contains(searchText, StringComparison.InvariantCultureIgnoreCase))
                    {
                        matchingStories.Add(story);
                        _logger.LogInformation("Found matching story {Id}: {Title}", story.Id, story.Title);
                        
                        if (matchingStories.Count >= targetSize)
                        {
                            break;
                        }
                    }

                    storiesChecked++;
                    if (storiesChecked % 100 == 0)
                    {
                        _logger.LogInformation("Checked {Count} stories, found {Matches} matches", 
                            storiesChecked, matchingStories.Count);
                    }
                }
                currentId--;
            }
        }

        _logger.LogInformation(
            "Search completed. Found {MatchCount} matches after checking {CheckedCount} stories. Search text: '{SearchText}'", 
            matchingStories.Count, 
            storiesChecked,
            searchText
        );

        return matchingStories
            .OrderByDescending(x => x.Id)
            .Take(targetSize)
            .ToList();
    }

    public async Task<List<NewsItem>> GetStoriesAsync(int fromId, int size, CancellationToken cancellationToken = default)
    {
        var targetSize = Math.Min(size, _maxPageSize);
        var stories = await GetCachedStoriesAsync(cancellationToken);
        var validStoriesCount = 0;
        var currentId = fromId;

        while (validStoriesCount < targetSize && currentId > 0)
        {
            var story = await GetItemAsync(currentId, true, true, true, cancellationToken);
            if (story != null)
            {
                validStoriesCount++;
            }
            currentId--;
        }

        // Get from cache
        stories = await GetCachedStoriesAsync(cancellationToken);
        return stories.Values
            .Where(s => s.Id <= fromId)
            .OrderByDescending(s => s.Id)
            .Take(targetSize)
            .ToList();
    }

    public async Task<List<NewsItem>> GetNewStoriesAsync(int size = 0, bool urlOnly = true, bool titleOnly = true, CancellationToken cancellationToken = default)
    {
        var targetSize = size <= 0 ? _maxPageSize : Math.Min(size, _maxPageSize);

        // Get new story IDs to maintain order of newest stories
        var storyIds = await _cache.GetOrCreateAsync("new-stories", entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_cacheDurationMinutes);
            return GetNewStoryIdsAsync(cancellationToken);
        });

        // Fetch stories if not in cache
        foreach (var id in storyIds!.Take(targetSize))
        {
            await GetItemAsync(id, urlOnly, titleOnly, true, cancellationToken);
        }

        // Get from cache
        var stories = await GetCachedStoriesAsync(cancellationToken);
        return storyIds!
            .Take(targetSize)
            .Where(id => stories.ContainsKey(id))
            .Select(id => stories[id])
            .ToList();
    }

    private async Task<int[]> GetNewStoryIdsAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await _httpClient.GetFromJsonAsync<int[]>("newstories.json", cancellationToken) ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching latest stories");
            return [];
        }
    }

    public async Task<int> GetMaxItemIdAsync()
    {
        return await _cache.GetOrCreateAsync("maxitem", async entry =>
        {
            _logger.LogInformation("Fetching max item ID from API");
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_cacheDurationMinutes);
            try
            {
                return await _httpClient.GetFromJsonAsync<int>("maxitem.json");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching max item ID");
                return 0;
            }
        });
    }

}