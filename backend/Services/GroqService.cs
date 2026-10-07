using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace WheelApi.Services
{
    public class GroqService : IGroqService
    {
        private readonly HttpClient _httpClient;

        public GroqService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", configuration["GroqApiKey"]!);
        }

        public async Task<string> GetSentence()
        {
            var prompt = "Generate a random and diverse sentence in Romanian language without diacritics, between 40 and 80 characters long (including spaces). Return only the sentence, no other text, no markdown.";
        
            var requestBody = new
            {
                model = "openai/gpt-oss-120b",
                messages = new [] {new { role = "user", content = prompt}}
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("https://api.groq.com/openai/v1/chat/completions", content);
            var responseJson = await response.Content.ReadAsStringAsync();

            if(!response.IsSuccessStatusCode)
            {
                throw new Exception($"Groq error: {responseJson}");
            }

            using var doc = JsonDocument.Parse(responseJson);
            var text = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()!;
            text = text.Trim().TrimStart('`').TrimEnd('`');

            return text;
        }
    }
}