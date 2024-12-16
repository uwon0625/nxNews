using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Mvc;

using Moq;
using NewsApi.Controllers;
using NewsApi.Models;
using NewsApi.Services;
using Xunit;

namespace NewsApi.Tests.Controllers;

public class NewsControllerTests
{
    private readonly Mock<INewsService> _newsServiceMock;
    private readonly Mock<ILogger<NewsController>> _loggerMock;
    private readonly Mock<IConfiguration> _configMock;
    private readonly NewsController _controller;

    public NewsControllerTests()
    {
        _newsServiceMock = new Mock<INewsService>();
        _loggerMock = new Mock<ILogger<NewsController>>();
        _configMock = new Mock<IConfiguration>();
        
        // Setup MaxPageSize configuration for both News and HackerNews sections
        var hackerNewsMaxPageSizeSection = new Mock<IConfigurationSection>();
        hackerNewsMaxPageSizeSection.Setup(x => x.Value).Returns("20");
        _configMock.Setup(x => x.GetSection("HackerNews:MaxPageSize")).Returns(hackerNewsMaxPageSizeSection.Object);

        var newsMaxPageSizeSection = new Mock<IConfigurationSection>();
        newsMaxPageSizeSection.Setup(x => x.Value).Returns("20");
        _configMock.Setup(x => x.GetSection("News:MaxPageSize")).Returns(newsMaxPageSizeSection.Object);
        
        _controller = new NewsController(
            _newsServiceMock.Object, 
            _loggerMock.Object,
            _configMock.Object
        );
    }

    [Fact]
    public async Task GetNewStories_ReturnsNewsItems()
    {
        // Arrange
        var expectedNews = new List<NewsItem>
        {
            new() { Id = 1, Title = "Test Story 1", Url = "http://test1.com" },
            new() { Id = 2, Title = "Test Story 2", Url = "http://test2.com" }
        };

        _newsServiceMock
            .Setup(x => x.GetNewStoriesAsync(0, true, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedNews);

        // Act
        var result = await _controller.GetNewStories();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(expectedNews, okResult.Value);
    }

    [Fact]
    public async Task GetStories_ReturnsStoriesFromService()
    {
        // Arrange
        int fromId = 100;
        int size = 5;
        var expectedStories = new List<NewsItem>
        {
            new() { Id = 99, Title = "Story 99", Url = "http://test99.com" },
            new() { Id = 98, Title = "Story 98", Url = "http://test98.com" }
        };

        _newsServiceMock
            .Setup(x => x.GetStoriesAsync(fromId, size, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedStories);

        // Act
        var result = await _controller.GetStories(fromId, size);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(expectedStories, okResult.Value);
    }

    [Fact]
    public async Task SearchStories_ReturnsMatchingStories()
    {
        // Arrange
        var searchText = "test";
        var maxId = 5;
        _newsServiceMock
            .Setup(x => x.GetMaxItemIdAsync())
            .ReturnsAsync(maxId);

        var expectedResults = new List<NewsItem>
        {
            new() { Id = 5, Title = "Test Story 5", Url = "http://test5.com" },
            new() { Id = 3, Title = "Test Story 3", Url = "http://test3.com" },
            new() { Id = 1, Title = "Test Story 1", Url = "http://test1.com" }
        };

        _newsServiceMock
            .Setup(x => x.SearchStoriesByTitleAsync(
                searchText, 
                20, 
                true, 
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResults);

        // Act
        var result = await _controller.SearchStories(searchText);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var stories = Assert.IsAssignableFrom<IEnumerable<NewsItem>>(okResult.Value);
        Assert.Equal(expectedResults, stories);
    }

    [Fact]
    public async Task SearchStories_WithSize_PassesParametersToService()
    {
        // Arrange
        string searchText = "test";
        int size = 5;

        // Act
        await _controller.SearchStories(searchText, size);

        // Assert
        _newsServiceMock.Verify(x => x.SearchStoriesByTitleAsync(
            searchText,
            size,
            true,
            It.IsAny<CancellationToken>()
        ), Times.Once);
    }

    [Fact]
    public async Task GetStories_ReturnsStoriesFromService_SortedByIdDescending()
    {
        // Arrange
        int fromId = 100;
        int size = 5;
        var expectedStories = new List<NewsItem>
        {
            new() { Id = 100, Title = "Story 100", Url = "http://test100.com" },
            new() { Id = 99, Title = "Story 99", Url = "http://test99.com" },
            new() { Id = 98, Title = "Story 98", Url = "http://test98.com" }
        };

        _newsServiceMock
            .Setup(x => x.GetStoriesAsync(fromId, size, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedStories);

        // Act
        var result = await _controller.GetStories(fromId, size);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var stories = Assert.IsAssignableFrom<IEnumerable<NewsItem>>(okResult.Value);
        
        // Verify descending order by Id
        Assert.Equal(expectedStories.OrderByDescending(s => s.Id), stories);
    }

} 