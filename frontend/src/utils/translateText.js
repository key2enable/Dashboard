import axios from 'axios';

export async function translateText(text, targetLang) {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const { data } = await axios.post(`${BASE_URL}/api/translate`, {
      text,
      target: targetLang,
  });

  return data.translatedText;
}
