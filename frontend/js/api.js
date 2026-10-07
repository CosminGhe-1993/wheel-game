import { API_URL } from "./config.js";

export async function getSentence(){
    const url = `${API_URL}/sentence`;
    const response = await fetch(url);
    const sentence = await response.text();
    console.log(sentence, sentence.length);
    return await sentence.replace(/^"|"$/g, "").trim();
}