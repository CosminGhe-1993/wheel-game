namespace WheelApi.Models;

public class DiceResult
{
    public int PlayerIndex { get; set; }
    public int Dice1 { get; set; }
    public int Dice2 { get; set; }
    public int Sum { get; set; }
    public bool IsDouble { get; set; }
    public int MaxDice { get; set; }
}
