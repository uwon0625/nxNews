using NewsApi.Services;
using Microsoft.OpenApi.Models;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

// Add CORS configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularDev",
        policy => policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader()
    );

    options.AddPolicy("AllowAzureStaticApp",
        builder => builder
            .WithOrigins("https://black-pond-01e5cac1e.4.azurestaticapps.net")
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "NT News API",
        Version = "v1",
        Description = "An API for accessing Nt News stories",
        Contact = new OpenApiContact
        {
            Name = "DL",
            Email = "your.email@example.com"
        }
    });

    // Include XML comments
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    c.IncludeXmlComments(xmlPath);
});

// Add Memory Cache
builder.Services.AddMemoryCache();

// Register INewsService and HackerNewsService
builder.Services.AddHttpClient<INewsService, HackerNewsService>();

var app = builder.Build();

// Enable CORS - make sure this is before other middleware
app.UseCors("AllowAngularDev");
app.UseCors("AllowAzureStaticApp");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
