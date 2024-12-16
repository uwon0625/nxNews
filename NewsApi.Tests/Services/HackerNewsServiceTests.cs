#nullable enable

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using NewsApi.Models;
using NewsApi.Services;
using System.Net;
using Moq.Protected;
using Xunit;
using NewsApi.Tests.Extensions;

namespace NewsApi.Tests.Services;

public class HackerNewsServiceTests
{
    private readonly Mock<IConfiguration> _configMock;
    private readonly Mock<IMemoryCache> _cacheMock;
    private readonly Mock<ILogger<HackerNewsService>> _loggerMock;
    private readonly Mock<HttpMessageHandler> _handlerMock;
    private readonly HttpClient _httpClient;
    private readonly string _storiesCacheKey;
    private Dictionary<int, NewsItem> _storiesCache = new();

    public HackerNewsServiceTests()
    {
        _configMock = new Mock<IConfiguration>();
        _cacheMock = new Mock<IMemoryCache>();
        _loggerMock = new Mock<ILogger<HackerNewsService>>();
        _handlerMock = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_handlerMock.Object);
        _storiesCacheKey = "cached-stories";

        SetupAllConfiguration();
    }

    [Fact]
    public async Task GetNewStoriesAsync_ReturnsExpectedStories()
    {
        // Arrange
        var storyIds = new[] { 3, 2, 1 };
        var stories = new[]
        {
            new NewsSourceItem { Id = 3, Title = "Story 3", Url = "http://test3.com", Type = "story" },
            new NewsSourceItem { Id = 2, Title = "Story 2", Url = "http://test2.com", Type = "story" },
            new NewsSourceItem { Id = 1, Title = "Story 1", Url = "http://test1.com", Type = "story" }
        };

        SetupCacheWithNewStories();
        SetupHttpMockResponse<int[]>("newstories.json", storyIds);
        foreach (var story in stories)
        {
            SetupHttpMockResponse<NewsSourceItem>($"item/{story.Id}.json", story);
        }

        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetNewStoriesAsync(3);

        // Assert
        Assert.Equal(3, result.Count);
        Assert.Collection(result,
            item =>
            {
                Assert.Equal(3, item.Id);
                Assert.Equal("Story 3", item.Title);
                Assert.Equal("http://test3.com", item.Url);
            },
            item =>
            {
                Assert.Equal(2, item.Id);
                Assert.Equal("Story 2", item.Title);
                Assert.Equal("http://test2.com", item.Url);
            },
            item =>
            {
                Assert.Equal(1, item.Id);
                Assert.Equal("Story 1", item.Title);
                Assert.Equal("http://test1.com", item.Url);
            }
        );
    }

    [Fact]
    public async Task GetItemAsync_ReturnsNull_WhenItemNotFound()
    {
        // Arrange
        SetupHttpMockResponse<NewsSourceItem>("item/999.json", (NewsSourceItem)null!);
        SetupCacheWithStories(new Dictionary<int, NewsItem>());

        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetItemAsync(999);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetItemAsync_ReturnsNull_WhenItemTypeIsNotStory()
    {
        // Arrange
        var nonStoryItem = new NewsSourceItem
        {
            Id = 1,
            Title = "Test Comment",
            Type = "comment",
            Url = "http://test.com"
        };

        SetupHttpMockResponse<NewsSourceItem>("item/1.json", nonStoryItem);
        SetupCacheWithStories(new Dictionary<int, NewsItem>());

        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetItemAsync(1);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetStoriesAsync_ReturnsStories_WhenMixedItemsHaveStoryTypeAndUrl()
    {
        // Arrange
        var maxId = 5;
        SetupHttpMockResponse<int>("maxitem.json", maxId);

        var stories = new[]
        {
            new NewsSourceItem { Id = 5, Title = "Story 5", Type = "story", Url = "http://test5.com" },
            new NewsSourceItem { Id = 4, Title = "job 4", Type = "job", Url = "http://job.com" },
            new NewsSourceItem { Id = 3, Title = "Story 3", Type = "story" },  // No URL
            new NewsSourceItem { Id = 2, Title = "comment 2", Type = "comment", Url = "http://comment.com" },
            new NewsSourceItem { Id = 1, Title = "Story 1", Type = "story", Url = "http://ok.com" }
        };

        // Setup story responses and prepare cache
        var validStories = new Dictionary<int, NewsItem>();
        foreach (var story in stories)
        {
            SetupHttpMockResponse<NewsSourceItem>($"item/{story.Id}.json", story);
            
            if (story.Type == "story" && !string.IsNullOrEmpty(story.Url))
            {
                validStories[story.Id] = new NewsItem 
                { 
                    Id = story.Id, 
                    Title = story.Title, 
                    Url = story.Url 
                };
            }
        }

        SetupCacheWithStories(validStories);

        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetStoriesAsync(5, 2);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Collection(result,
            item =>
            {
                Assert.Equal(5, item.Id);
                Assert.Equal("Story 5", item.Title);
                Assert.Equal("http://test5.com", item.Url);
            },
            item =>
            {
                Assert.Equal(1, item.Id);
                Assert.Equal("Story 1", item.Title);
                Assert.Equal("http://ok.com", item.Url);
            }
        );
    }

    [Fact]
    public async Task GetItemAsync_ReturnsCachedStory_WhenStoryExistsInCache()
    {
        // Arrange
        var cachedStory = new NewsItem { Id = 1, Title = "Cached Story", Url = "http://cached.com" };
        SetupCacheWithStories(new Dictionary<int, NewsItem> { { 1, cachedStory } });

        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetItemAsync(1);

        // Assert
        Assert.Equal(cachedStory, result);
        _handlerMock.Protected().Verify(
            "SendAsync",
            Times.Never(),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>()
        );
    }

    [Fact]
    public async Task GetItemAsync_AddsToStoriesCache_WhenFetchingNewStory()
    {
        // Arrange
        var story = new NewsSourceItem { Id = 1, Title = "New Story", Url = "http://test.com", Type = "story" };
        SetupHttpMockResponse<NewsSourceItem>("item/1.json", story);
        
        // Setup stories cache
        _storiesCache = new Dictionary<int, NewsItem>();

        // Setup cache mocks
        var cacheEntry = new Mock<ICacheEntry>();
        cacheEntry.SetupAllProperties();

        _cacheMock
            .Setup(m => m.TryGetValue(It.IsAny<object>(), out It.Ref<object?>.IsAny))
            .Callback(new OutCallback((object k, out object? v) => 
            {
                if (k.ToString() == _storiesCacheKey)
                {
                    v = _storiesCache;
                }
                else
                {
                    v = null;
                }
            }))
            .Returns<object, object?>((k, v) => k.ToString() == _storiesCacheKey);

        _cacheMock
            .Setup(m => m.CreateEntry(It.IsAny<object>()))
            .Returns(cacheEntry.Object);

        // Setup configuration
        var storiesCacheKeySection = new Mock<IConfigurationSection>();
        storiesCacheKeySection.Setup(x => x.Value).Returns(_storiesCacheKey);
        _configMock.Setup(x => x.GetSection("HackerNews:StoriesCacheKey")).Returns(storiesCacheKeySection.Object);

        var storiesCacheDurationSection = new Mock<IConfigurationSection>();
        storiesCacheDurationSection.Setup(x => x.Value).Returns("1");
        _configMock.Setup(x => x.GetSection("HackerNews:StoriesCacheDurationHours")).Returns(storiesCacheDurationSection.Object);

        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetItemAsync(1);

        // Assert
        Assert.NotNull(result);
        Assert.Contains(1, _storiesCache.Keys);
        Assert.Equal(story.Title, _storiesCache[1].Title);
    }

    [Fact]
    public async Task SearchStoriesByTitleAsync_UsesCacheFirst_BeforeCallingAPI()
    {
        // Arrange
        var cachedStories = new Dictionary<int, NewsItem>
        {
            { 5, new NewsItem { Id = 5, Title = "Test Story 5", Url = "http://test5.com" } },
            { 4, new NewsItem { Id = 4, Title = "Another Test", Url = "http://test4.com" } },
            { 3, new NewsItem { Id = 3, Title = "Test Story 3", Url = "http://test3.com" } }
        };

        SetupCacheWithStories(cachedStories);
        SetupHttpMockResponse<int>("maxitem.json", 5);

        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        var result = await service.SearchStoriesByTitleAsync("Test", 2);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.All(result, story => Assert.Contains("Test", story.Title));
    }

    [Fact]
    public async Task GetNewStoriesAsync_HandlesCacheMiss_AndPopulatesCache()
    {
        // Arrange
        var storyIds = new[] { 3, 2, 1 };
        var stories = new[]
        {
            new NewsSourceItem { Id = 3, Title = "Story 3", Url = "http://test3.com", Type = "story" },
            new NewsSourceItem { Id = 2, Title = "Story 2", Url = "http://test2.com", Type = "story" },
            new NewsSourceItem { Id = 1, Title = "Story 1", Url = "http://test1.com", Type = "story" }
        };

        // Setup stories cache
        _storiesCache = new Dictionary<int, NewsItem>();

        // Setup cache entry
        var cacheEntry = new Mock<ICacheEntry>();
        cacheEntry.SetupAllProperties();

        // Setup cache mocks
        _cacheMock
            .Setup(m => m.TryGetValue(It.IsAny<object>(), out It.Ref<object?>.IsAny))
            .Callback(new OutCallback((object k, out object? v) => 
            {
                if (k.ToString() == _storiesCacheKey)
                {
                    v = _storiesCache;
                }
                else if (k.ToString() == "new-stories")
                {
                    v = null;  // Force cache miss for new-stories
                }
                else
                {
                    v = null;
                }
            }))
            .Returns<object, object?>((k, v) => k.ToString() == _storiesCacheKey);

        _cacheMock
            .Setup(m => m.CreateEntry(It.IsAny<object>()))
            .Returns(cacheEntry.Object);

        // Setup configuration
        var storiesCacheKeySection = new Mock<IConfigurationSection>();
        storiesCacheKeySection.Setup(x => x.Value).Returns(_storiesCacheKey);
        _configMock.Setup(x => x.GetSection("HackerNews:StoriesCacheKey")).Returns(storiesCacheKeySection.Object);

        var storiesCacheDurationSection = new Mock<IConfigurationSection>();
        storiesCacheDurationSection.Setup(x => x.Value).Returns("1");
        _configMock.Setup(x => x.GetSection("HackerNews:StoriesCacheDurationHours")).Returns(storiesCacheDurationSection.Object);

        SetupHttpMockResponse<int[]>("newstories.json", storyIds);
        foreach (var story in stories)
        {
            SetupHttpMockResponse<NewsSourceItem>($"item/{story.Id}.json", story);
        }

        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetNewStoriesAsync(3);

        // Assert
        Assert.Equal(3, result.Count);
        Assert.Equal(3, _storiesCache.Count);
        Assert.All(stories, story => 
            Assert.Contains(_storiesCache.Values, cached => 
                cached.Id == story.Id && cached.Title == story.Title));
    }

    [Fact]
    public async Task GetStoriesAsync_RespectsCacheExpiration()
    {
        // Arrange
        TimeSpan? actualExpiration = null;

        // Setup stories cache
        _storiesCache = new Dictionary<int, NewsItem>();
        
        // Setup cache entry with expiration tracking
        var cacheEntry = new Mock<ICacheEntry>();
        cacheEntry.SetupAllProperties();

        // Setup the cache entry to track expiration
        cacheEntry.SetupSet(x => x.AbsoluteExpirationRelativeToNow = It.IsAny<TimeSpan?>())
            .Callback<TimeSpan?>(timeSpan => actualExpiration = timeSpan);

        // Setup cache mocks
        _cacheMock
            .Setup(m => m.TryGetValue(It.IsAny<object>(), out It.Ref<object?>.IsAny))
            .Callback(new OutCallback((object k, out object? v) => v = null))
            .Returns(false);

        _cacheMock
            .Setup(m => m.CreateEntry(It.IsAny<object>()))
            .Returns(cacheEntry.Object);

        // Setup HTTP responses
        var maxId = 5;
        SetupHttpMockResponse<int>("maxitem.json", maxId);

        // Setup stories for IDs 1 through 5
        for (int i = 1; i <= 5; i++)
        {
            var story = new NewsSourceItem 
            { 
                Id = i, 
                Title = $"Story {i}", 
                Url = $"http://test{i}.com", 
                Type = "story" 
            };
            SetupHttpMockResponse<NewsSourceItem>($"item/{i}.json", story);
        }

        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        await service.GetStoriesAsync(5, 2);

        // Assert
        Assert.NotNull(actualExpiration);
        Assert.Equal(TimeSpan.FromHours(1), actualExpiration.Value);
    }

    [Fact]
    public async Task GetItemAsync_HandlesApiTimeout()
    {
        // Arrange
        SetupCacheWithStories(new Dictionary<int, NewsItem>());

        // Setup HTTP mock to throw timeout for any request
        _handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ThrowsAsync(new HttpRequestException("The operation has timed out.", new TimeoutException()));

        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetItemAsync(1);

        // Assert
        Assert.Null(result);
        _loggerMock.VerifyWarningWasLogged("Attempt 1 of 4 failed for GetItem-1");
    }

    [Fact]
    public async Task GetItemAsync_HandlesRateLimiting()
    {
        // Arrange
        var story = new NewsSourceItem { Id = 1, Title = "Test Story", Url = "http://test.com", Type = "story" };
        SetupHttpMockResponse<NewsSourceItem>("item/1.json", story);
        SetupCacheWithStories(new Dictionary<int, NewsItem>());

        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act - Make multiple concurrent requests
        var tasks = Enumerable.Range(0, 10)
            .Select(_ => service.GetItemAsync(1))
            .ToList();

        var results = await Task.WhenAll(tasks);

        // Assert
        Assert.All(results, result => Assert.NotNull(result));
        Assert.All(results, result => Assert.Equal("Test Story", result!.Title));
    }

    [Fact]
    public async Task SearchStoriesByTitleAsync_HandlesEmptyCache()
    {
        // Arrange
        var maxId = 5;
        SetupHttpMockResponse<int>("maxitem.json", maxId);
        
        var stories = new[]
        {
            new NewsSourceItem { Id = 5, Title = "Test Story", Url = "http://test.com", Type = "story" }
        };

        foreach (var story in stories)
        {
            SetupHttpMockResponse<NewsSourceItem>($"item/{story.Id}.json", story);
        }

        SetupCacheWithStories(new Dictionary<int, NewsItem>());
        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        var result = await service.SearchStoriesByTitleAsync("Test", 1);

        // Assert
        Assert.Single(result);
        Assert.Equal("Test Story", result[0].Title);
    }

    [Fact]
    public async Task GetNewStoriesAsync_HandlesInvalidResponse()
    {
        // Arrange
        _handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.PathAndQuery.Contains("newstories.json")),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.BadRequest,
                Content = new StringContent("Invalid request")
            });

        SetupCacheWithStories(new Dictionary<int, NewsItem>());
        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetNewStoriesAsync(5);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetStoriesAsync_HandlesNonSequentialIds()
    {
        // Arrange
        var maxId = 5;
        SetupHttpMockResponse<int>("maxitem.json", maxId);

        var stories = new Dictionary<int, NewsSourceItem>
        {
            { 5, new NewsSourceItem { Id = 5, Title = "Story 5", Type = "story", Url = "http://test5.com" } },
            { 3, new NewsSourceItem { Id = 3, Title = "Story 3", Type = "story", Url = "http://test3.com" } },
            { 1, new NewsSourceItem { Id = 1, Title = "Story 1", Type = "story", Url = "http://test1.com" } }
        };

        // Setup all story responses, including missing IDs
        for (int i = 1; i <= maxId; i++)
        {
            if (stories.ContainsKey(i))
            {
                SetupHttpMockResponse<NewsSourceItem>($"item/{i}.json", stories[i]);
            }
            else
            {
                // Setup null response for missing IDs
                SetupHttpMockResponse<NewsSourceItem>($"item/{i}.json", null);
            }
        }

        SetupCacheWithStories(new Dictionary<int, NewsItem>());
        var service = new HackerNewsService(_httpClient, _configMock.Object, _cacheMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetStoriesAsync(5, 3);

        // Assert
        Assert.Equal(3, result.Count);
        Assert.Equal(5, result[0].Id);
        Assert.Equal(3, result[1].Id);
        Assert.Equal(1, result[2].Id);
    }

    private void SetupHttpMockResponse<T>(string url, T? response)
    {
        string content = response switch
        {
            null => "null",
            int intValue => intValue.ToString(),
            _ => System.Text.Json.JsonSerializer.Serialize(response)
        };

        _handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.PathAndQuery.Contains(url)),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() => new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(content)
            });
    }

    private void SetupDefaultMocks()
    {
        // Setup cache entry
        var cacheEntry = new Mock<ICacheEntry>();
        cacheEntry.SetupAllProperties();

        // Setup cache mocks
        _cacheMock
            .Setup(m => m.TryGetValue(It.IsAny<object>(), out It.Ref<object?>.IsAny))
            .Callback(new OutCallback((object k, out object? v) => 
            {
                if (k.ToString() == _storiesCacheKey)
                {
                    v = _storiesCache;
                }
                else
                {
                    v = null;
                }
            }))
            .Returns<object, object?>((k, v) => k.ToString() == _storiesCacheKey);

        _cacheMock
            .Setup(m => m.CreateEntry(It.IsAny<object>()))
            .Returns(cacheEntry.Object);

        // Setup configuration
        SetupStoriesConfiguration();
    }

    private void SetupStoriesConfiguration()
    {
        var storiesCacheKeySection = new Mock<IConfigurationSection>();
        storiesCacheKeySection.Setup(x => x.Value).Returns(_storiesCacheKey);
        _configMock.Setup(x => x.GetSection("HackerNews:StoriesCacheKey"))
            .Returns(storiesCacheKeySection.Object);

        var storiesCacheDurationSection = new Mock<IConfigurationSection>();
        storiesCacheDurationSection.Setup(x => x.Value).Returns("1");
        _configMock.Setup(x => x.GetSection("HackerNews:StoriesCacheDurationHours"))
            .Returns(storiesCacheDurationSection.Object);
    }

    private void SetupCacheWithStories(Dictionary<int, NewsItem> stories)
    {
        _storiesCache = stories;

        // Setup cache entry
        var cacheEntry = new Mock<ICacheEntry>();
        cacheEntry.SetupAllProperties();

        // Setup cache mocks
        _cacheMock
            .Setup(m => m.TryGetValue(It.IsAny<object>(), out It.Ref<object?>.IsAny))
            .Callback(new OutCallback((object k, out object? v) => 
            {
                if (k.ToString() == _storiesCacheKey)
                {
                    v = _storiesCache;
                }
                else
                {
                    v = null;
                }
            }))
            .Returns<object, object?>((k, v) => k.ToString() == _storiesCacheKey);

        _cacheMock
            .Setup(m => m.CreateEntry(It.IsAny<object>()))
            .Returns(cacheEntry.Object);

        // Ensure configuration is set up
        SetupAllConfiguration();
    }

    private void SetupCacheWithNewStories()
    {
        _storiesCache = new Dictionary<int, NewsItem>();
        var cacheEntry = new Mock<ICacheEntry>();
        cacheEntry.SetupAllProperties();

        _cacheMock
            .Setup(m => m.TryGetValue(It.IsAny<object>(), out It.Ref<object?>.IsAny))
            .Callback(new OutCallback((object k, out object? v) => 
            {
                if (k.ToString() == _storiesCacheKey)
                    v = _storiesCache;
                else if (k.ToString() == "new-stories")
                    v = null;
                else
                    v = null;
            }))
            .Returns<object, object?>((k, v) => k.ToString() == _storiesCacheKey);

        _cacheMock
            .Setup(m => m.CreateEntry(It.IsAny<object>()))
            .Returns(cacheEntry.Object);

        SetupStoriesConfiguration();
    }

    // Add this delegate at class level
    private delegate void OutCallback(object key, out object? value);

    private void SetupAllConfiguration()
    {
        // Setup direct configuration values
        _configMock
            .Setup(x => x["HackerNews:BaseUrl"])
            .Returns("https://hacker-news.firebaseio.com/v0/");

        _configMock
            .Setup(x => x["HackerNews:StoriesCacheKey"])
            .Returns(_storiesCacheKey);

        // Setup sections for numeric values
        var cacheDurationSection = new Mock<IConfigurationSection>();
        cacheDurationSection.Setup(x => x.Value).Returns("5");
        _configMock
            .Setup(x => x.GetSection("HackerNews:CacheDurationMinutes"))
            .Returns(cacheDurationSection.Object);

        var maxPageSizeSection = new Mock<IConfigurationSection>();
        maxPageSizeSection.Setup(x => x.Value).Returns("20");
        _configMock
            .Setup(x => x.GetSection("HackerNews:MaxPageSize"))
            .Returns(maxPageSizeSection.Object);

        var storiesCacheDurationSection = new Mock<IConfigurationSection>();
        storiesCacheDurationSection.Setup(x => x.Value).Returns("1");
        _configMock
            .Setup(x => x.GetSection("HackerNews:StoriesCacheDurationHours"))
            .Returns(storiesCacheDurationSection.Object);

        // Setup API timeout
        var timeoutSection = new Mock<IConfigurationSection>();
        timeoutSection.Setup(x => x.Value).Returns("00:00:30");
        _configMock
            .Setup(x => x.GetSection("HackerNews:ApiTimeout"))
            .Returns(timeoutSection.Object);

        // Setup retry settings
        var retryCountSection = new Mock<IConfigurationSection>();
        retryCountSection.Setup(x => x.Value).Returns("3");
        _configMock
            .Setup(x => x.GetSection("HackerNews:RetryCount"))
            .Returns(retryCountSection.Object);

        var retryWaitSection = new Mock<IConfigurationSection>();
        retryWaitSection.Setup(x => x.Value).Returns("2");
        _configMock
            .Setup(x => x.GetSection("HackerNews:RetryWaitSeconds"))
            .Returns(retryWaitSection.Object);

        // Setup rate limit settings
        var permitLimitSection = new Mock<IConfigurationSection>();
        permitLimitSection.Setup(x => x.Value).Returns("100");
        _configMock
            .Setup(x => x.GetSection("HackerNews:RateLimit:PermitLimit"))
            .Returns(permitLimitSection.Object);

        var windowSecondsSection = new Mock<IConfigurationSection>();
        windowSecondsSection.Setup(x => x.Value).Returns("60");
        _configMock
            .Setup(x => x.GetSection("HackerNews:RateLimit:WindowSeconds"))
            .Returns(windowSecondsSection.Object);
    }
}