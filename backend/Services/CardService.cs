using MongoDB.Driver;
using WheelApi.Models;

namespace WheelApi.Services;

public class CardService : ICardService
{
    private readonly IMongoCollection<Card> _collection;
    private List<string>? _cached;
    private List<Card>? _cachedCards;
    public CardService(IConfiguration config)
    {
        var client = new MongoClient(config["MongoDb:ConnectionString"]);
        var db = client.GetDatabase(config["MongoDb:Database"]);
        _collection = db.GetCollection<Card>("cards");
    }

    public async Task<List<string>> GetCardNamesAsync()
    {
        if (_cached != null) return _cached;
        var cards = await _collection.Find(_ => true).ToListAsync();
        _cached = cards.Select(c => c.Name).ToList();
        return _cached;
    }

    public async Task<List<Card>> GetCardsAsync()
    {
        if (_cachedCards != null) 
        {
            return _cachedCards;
        }
        _cachedCards = await _collection.Find(_ => true).ToListAsync();
        return _cachedCards;
    }
}
