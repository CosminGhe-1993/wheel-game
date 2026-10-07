namespace WheelApi.Models;

public class Effect
{
    public string Name { get; set; } = string.Empty;
    public int? OwnerIndex { get; set; }
    public int? TargetIndex { get; set; }
}