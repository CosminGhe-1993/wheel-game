using Microsoft.AspNetCore.Mvc;
using WheelApi.Services;

namespace WheelApi.Controllers;

[ApiController]
[Route("api/[controller]")]

public class SentenceController: ControllerBase
{
    private readonly IGroqService _groqService;

    public SentenceController(IGroqService groqService)
    {
        _groqService = groqService;
    }

    [HttpGet]
    public async Task<ActionResult<string>> GetSentence()
    {
        int attempts = 0;
        while(attempts < 5)
        {
            var sentence = await _groqService.GetSentence();
            if(string.IsNullOrWhiteSpace(sentence) || sentence.Length < 40 || sentence.Length > 80)
            {
                attempts++;
                continue;
            }
            return Ok(sentence);
        }
        
        return StatusCode(500, "Could not generate a valid sentence after 5 attempts.");
    }
}