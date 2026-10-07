namespace WheelApi.Services
{
    public interface IGroqService
    {
        Task<string> GetSentence();
    }
}