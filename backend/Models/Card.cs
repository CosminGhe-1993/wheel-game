using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WheelApi.Models;

public class Card
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = "";
    [BsonElement("name")]
    public string Name { get; set; } = "";
    [BsonElement("description")]
    public string Description { get; set; } = "";
    [BsonElement("color")]
    public string Color { get; set; } = "";
}