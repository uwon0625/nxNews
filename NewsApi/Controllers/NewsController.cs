using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using NewsApi.Services;
using NewsApi.Models;
using System.ComponentModel.DataAnnotations;

namespace NewsApi.Controllers;

[ApiController]
[Route("[controller]")]
[Produces("application/json")]
public class NewsController : ControllerBase
{
    private readonly INewsService _newsService;
    private readonly ILogger<NewsController> _logger;
    private readonly int _maxPageSize;
    private readonly IConfiguration _configuration;

    public NewsController(
        INewsService newsService, 
        ILogger<NewsController> logger,
        IConfiguration configuration)
    {
        _newsService = newsService;
        _logger = logger;
        _maxPageSize = configuration.GetValue<int>("HackerNews:MaxPageSize", 100);
        _configuration = configuration;
    }

    /// <summary>
    /// Gets the latest news stories
    /// </summary>
    /// <param name="size">Number of stories to return. Defaults to configured MaxPageSize if 0 or not specified</param>
    /// <param name="cancellationToken"></param>
    /// <returns>A list of the latest news stories</returns>
    /// <response code="200">Returns the list of stories</response>
    /// <response code="500">If there was an error fetching the stories</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<NewsItem>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<NewsItem>>> GetNewStories([FromQuery] int size = 0, CancellationToken cancellationToken = default)
    {
        try
        {
            var stories = await _newsService.GetNewStoriesAsync(size, cancellationToken: cancellationToken);
            return Ok(stories);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499, "Client closed request");  // Using 499 status code for client cancellation
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching news");
            return StatusCode(500, "An error occurred while fetching news");
        }
    }

    /// <summary>
    /// Gets stories starting from a specific ID
    /// </summary>
    /// <param name="startId">The ID to start fetching stories from</param>
    /// <param name="size">Number of stories to return</param>
    /// <returns>A list of stories</returns>
    /// <response code="200">Returns the list of stories</response>
    /// <response code="400">If the parameters are invalid</response>
    /// <response code="500">If there was an error fetching the stories</response>
    [HttpGet("stories")]
    [ProducesResponseType(typeof(IEnumerable<NewsItem>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<NewsItem>>> GetStories(
        [FromQuery][Range(1, int.MaxValue)] int startId = 1, 
        [FromQuery][Range(1, 100)] int size = 10)
    {
        try
        {
            if (size <= 0 || size > _maxPageSize)
            {
                return BadRequest($"Size must be between 1 and {_maxPageSize}");
            }

            if (startId <= 0)
            {
                return BadRequest("StartId must be greater than 0");
            }

            var stories = await _newsService.GetStoriesAsync(startId, size);
            return Ok(stories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching stories from {StartId} with size {Size}", startId, size);
            return StatusCode(500, "An error occurred while fetching stories");
        }
    }

    /// <summary>
    /// Searches stories by title
    /// </summary>
    /// <param name="searchText">Text to search for in story titles</param>
    /// <param name="size">Maximum number of stories to return</param>
    /// <returns>A list of matching stories</returns>
    /// <response code="200">Returns the matching stories</response>
    /// <response code="400">If the search text is empty</response>
    /// <response code="500">If there was an error searching stories</response>
    [HttpGet("search/{searchText}")]
    [ProducesResponseType(typeof(IEnumerable<NewsItem>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<NewsItem>>> SearchStories(
        [Required][MinLength(1)] string searchText, 
        [FromQuery][Range(0, 100)] int size = 0)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(searchText))
            {
                return BadRequest("Search text cannot be empty");
            }

            // URL decode the search text and remove any query parameters
            searchText = Uri.UnescapeDataString(searchText).Split('&')[0];

            var maxPageSize = _configuration.GetValue<int>("News:MaxPageSize", 20);
            var targetSize = size <= 0 ? maxPageSize : Math.Min(size, maxPageSize);
            
            _logger.LogInformation("Searching stories with text: {SearchText}, size: {Size}", searchText, targetSize);
            var results = await _newsService.SearchStoriesByTitleAsync(searchText, targetSize, true);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching stories with text: {SearchText}", searchText);
            return StatusCode(500, "An error occurred while searching stories");
        }
    }
} 