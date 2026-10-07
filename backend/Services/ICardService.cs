using WheelApi.Models;

namespace WheelApi.Services;

public interface ICardService
{
    Task<List<string>> GetCardNamesAsync();
    Task<List<Card>> GetCardsAsync();
}