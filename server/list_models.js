import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  try {
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const models = response.data.models.map(m => m.name).filter(name => name.includes('gemini'));
    console.log(models);
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
}

listModels();
