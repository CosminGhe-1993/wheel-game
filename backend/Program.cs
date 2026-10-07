using WheelApi.Hubs;
using WheelApi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddHttpClient<GroqService>();
builder.Services.AddScoped<IGroqService, GroqService>();
builder.Services.AddSingleton<ICardService, CardService>();
builder.Services.AddSingleton<IGameRoomService, GameRoomService>();
builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors();
app.MapControllers();
app.MapHub<GameHub>("/gamehub");

app.Run();