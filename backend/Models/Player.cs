namespace WheelApi.Models;

public class Player
{
    public string ConnectionId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Score { get; set; } = 0;
    public List<string> Cards { get; set; } = new();
    public List<Effect> ActiveEffects { get; set; } = new();
}