using WheelApi.Models;

namespace WheelApi.Services;

public interface IGameRoomService
{
    string CreateRoom(string displayConnectionId, int maxPlayers, int totalRounds);
    bool JoinRoom(string roomCode, string connectionId);
    bool SetPlayerName(string connectionId, string name);
    GameRoom? GetRoom(string roomCode);
    GameRoom? GetRoomByConnectionId(string connectionId);
    Player? GetPlayer(string connectionId);
    string? RemoveConnection(string connectionId);
    bool AllPlayersNamed(string roomCode);
}
