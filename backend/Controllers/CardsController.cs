using Microsoft.AspNetCore.Mvc;
using WheelApi.Services;


namespace WheelApi.Controllers;

[ApiController]
[Route("api/cards")]
public class CardsController : ControllerBase
{
    private readonly ICardService _cardService;
    
    public CardsController(ICardService cardService)
    {
        _cardService = cardService;
    }

    [HttpGet]
    public async Task<IActionResult> GetCards()
    {
        var cards = await _cardService.GetCardsAsync();
        return Ok(cards);
    }
}