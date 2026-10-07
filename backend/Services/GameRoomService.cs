using WheelApi.Models;

namespace WheelApi.Services;

public class GameRoomService : IGameRoomService
{
    private readonly Dictionary<string, GameRoom> _rooms = new();
    private readonly Dictionary<string, string> _connectionRoomMap = new();
    private readonly Random _random = new();
    private readonly object _lock = new();

    public string CreateRoom(string displayConnectionId, int maxPlayers, int totalRounds)
    {
        lock (_lock)
        {
            string code;
            do { code = GenerateCode(); } while (_rooms.ContainsKey(code));

            var room = new GameRoom
            {
                RoomCode = code,
                MaxPlayers = maxPlayers,
                TotalRounds = totalRounds,
                DisplayConnectionId = displayConnectionId
            };

            _rooms[code] = room;
            _connectionRoomMap[displayConnectionId] = code;
            return code;
        }
    }

    public bool JoinRoom(string roomCode, string connectionId)
    {
        lock (_lock)
        {
            if (!_rooms.TryGetValue(roomCode, out var room)) return false;
            if (room.Players.Count >= room.MaxPlayers) return false;

            room.Players.Add(new Player { ConnectionId = connectionId });
            _connectionRoomMap[connectionId] = roomCode;
            return true;
        }
    }

    public bool SetPlayerName(string connectionId, string name)
    {
        lock (_lock)
        {
            var player = GetPlayer(connectionId);
            if (player == null) return false;
            player.Name = name;
            return true;
        }
    }

    public GameRoom? GetRoom(string roomCode)
    {
        lock (_lock)
        {
            _rooms.TryGetValue(roomCode, out var room);
            return room;
        }
    }

    public GameRoom? GetRoomByConnectionId(string connectionId)
    {
        lock (_lock)
        {
            if (!_connectionRoomMap.TryGetValue(connectionId, out var code)) return null;
            return GetRoom(code);
        }
    }

    public Player? GetPlayer(string connectionId)
    {
        lock (_lock)
        {
            var room = GetRoomByConnectionId(connectionId);
            return room?.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
        }
    }

    public string? RemoveConnection(string connectionId)
    {
        lock (_lock)
        {
            if (!_connectionRoomMap.TryGetValue(connectionId, out var code)) return null;
            _connectionRoomMap.Remove(connectionId);

            if (!_rooms.TryGetValue(code, out var room)) return code;
            room.Players.RemoveAll(p => p.ConnectionId == connectionId);

            if (room.DisplayConnectionId == connectionId || room.Players.Count == 0)
                _rooms.Remove(code);

            return code;
        }
    }

    public bool AllPlayersNamed(string roomCode)
    {
        lock (_lock)
        {
            if (!_rooms.TryGetValue(roomCode, out var room)) return false;
            return room.Players.Count == room.MaxPlayers
                && room.Players.All(p => !string.IsNullOrWhiteSpace(p.Name));
        }
    }

    private string GenerateCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        return new string(Enumerable.Range(0, 4).Select(_ => chars[_random.Next(chars.Length)]).ToArray());
    }
}
