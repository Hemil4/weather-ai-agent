import dotenv from "dotenv";
import Groq from "groq-sdk";
import readlineSync from "readline-sync";

dotenv.config();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function getWeatherDetails(city = "") {
  if (city.toLowerCase() === "ahmedabad") return "10°C";
  if (city.toLowerCase() === "vadodra") return "22°C";
  if (city.toLowerCase() === "katch") return "33°C";
  return "I don't have real-time weather data. Please check an official weather site.";
}

const tools = {
  getWeatherDetails: getWeatherDetails,
};

async function getWeatherResponse(userInput, SYSTEM_PROMPT) {
  try {
    const response = await client.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "assistant",
          content:
            '{"type":"plan","plan":"I will call the getWeatherDetails function with the input of Ahmedabad to get the weather details."}',
        },
        {
          role: "assistant",
          content:
            '{"type":"action","function":"getWeatherDetails","input":"ahmedabad"}',
        },
        {
          role: "assistant",
          content: '{"type":"observation","observation":"20°C"}',
        },
        { role: "user", content: userInput },
      ],
    });
    console.log(response.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

const userQuery = "Hey, What is the weather of Ahmedabad?";

const SYSTEM_PROMPT = `You are an AI Assistant that follows a structured JSON-based workflow with START, PLAN, ACTION, OBSERVATION, and OUTPUT states.
Wait for the user prompt and first PLAN using available tools.
After Planning, Take the action with appropriate tools and wat for Observation based on Action.
Once you get the observations, Return the AI response based on START prompt and observations

Available Tools:
- function getWeatherDetails(city = '') : string
getWeatherDetails is a funciton that accepts city name as string and returns the weather details

Example:
START
{"type":"user","user":"What is the sum of weather of Ahmedabad and vadodra?"}
{"type":"plan","plan":"I will call the getWeatherDetails for Ahmedabad"}
{"type":"action","function":"getWeatherDetails","input":"ahmedabad"}
{"type":"observation","observation":"10°C"}
{"type":"plan","plan":"I will call the getWeatherDetails for vadodra"}
{"type":"action","function":"getWeatherDetails","input":"vadodra"}
{"type":"observation","observation":"14°C"}
{"type":"output","output":"The sum of weather of Ahmedabad and Vadodra is 24°C"}
`;

getWeatherResponse(userQuery, SYSTEM_PROMPT);
const messages = [{ role: "system", content: SYSTEM_PROMPT }];

while (true) {
  const query = readlineSync.question(">> ");
  const q = {
    type: "user",
    user: query,
  };
  messages.push({ role: "user", content: JSON.stringify(q) });
  while (true) {
    const chat = await client.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: messages,
      response_format: { type: "json_object" },
    });

    const result = chat.choices[0].message.content;
    messages.push({
      role: "assistant",
      content: result,
    });
    console.log(`---------------- START AI ----------------`);
    console.log(result);
    console.log(`---------------- END AI ----------------`);
    const call = JSON.parse(result);

    if (call.type == "output") {
      console.log(`bot : ${call.output}`);
      break;
    } else if (call.type == "action") {
      const fn = tools[call.function];
      const observation = fn(call.input);
      const obs = { type: "observation", observation: observation };
      messages.push({ role: "assistant", content: JSON.stringify(obs) });
    }
  }
}
