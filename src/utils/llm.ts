import OpenAI from 'openai';
import { config } from '../config';
import { log } from './index';
import { Contact } from '../types';

interface ExtractedEvent {
  date: string;
  location: string;
}

interface ExtractedInfo {
  events: ExtractedEvent[];
  contact?: Contact;
}

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export async function extractInfoWithLLM(
  text: string,
  retryCount = 0
): Promise<ExtractedInfo> {
  if (!config.openai.apiKey) {
    log.warning('OpenAI API key not found');
    throw new Error('OpenAI API key not configured');
  }

  const MAX_RETRIES = 3;
  const STRICT_PROMPT = `You are a concert information extractor. Your task is to extract concert dates, locations, and contact information from the provided text.

You MUST:
1. Return ONLY valid JSON in the exact format specified
2. Include ONLY confirmed dates and locations
3. Format dates as "DD month YYYY" (e.g., "24 juni 2025")
4. Format locations as "Venue, City" (e.g., "Vorst Nationaal, Brussel")
5. Ensure all strings are properly escaped
6. Return an empty events array if no valid events are found

Required JSON format:
{
  "events": [
    {
      "date": "DD month YYYY",
      "location": "Venue Name, City"
    }
  ],
  "contact": {
    "name": "Full Name",
    "email": "email@address"
  }
}

If no valid contact is found, omit the contact field entirely.
Do not include any explanatory text or notes in your response.
Your response must be parseable JSON.

Text to analyze:
${text}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are a JSON-only response bot. You must return valid, parseable JSON.',
        },
        {
          role: 'user',
          content: STRICT_PROMPT,
        },
      ],
      model: config.openai.model,
      temperature: config.openai.temperature,
      max_tokens: config.openai.maxTokens, // Increase token limit for better context
      response_format: { type: 'json_object' },
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    try {
      const parsed = JSON.parse(result) as ExtractedInfo;

      // Validate the structure
      if (!Array.isArray(parsed.events)) {
        throw new Error('Invalid response format: events is not an array');
      }

      // Validate each event
      parsed.events = parsed.events.filter((event) => {
        const isValid =
          typeof event.date === 'string' &&
          typeof event.location === 'string' &&
          event.date.match(/^\d{1,2} [a-z]+ \d{4}$/i) &&
          event.location.includes(',');

        if (!isValid) {
          log.warning(`Filtered out invalid event: ${JSON.stringify(event)}`);
        }
        return isValid;
      });

      // Validate contact if present
      if (parsed.contact) {
        const isValidContact =
          typeof parsed.contact.name === 'string' &&
          typeof parsed.contact.email === 'string' &&
          parsed.contact.email.includes('@');

        if (!isValidContact) {
          delete parsed.contact;
          log.warning('Removed invalid contact information');
        }
      }

      return {
        events: parsed.events.length
          ? parsed.events
          : [{ date: 'Date not found', location: 'Location not found' }],
        contact: parsed.contact,
      };
    } catch (parseError) {
      if (retryCount < MAX_RETRIES) {
        log.warning(
          `JSON parse error, retrying (attempt ${
            retryCount + 1
          }/${MAX_RETRIES})`
        );
        return extractInfoWithLLM(text, retryCount + 1);
      }
      throw parseError;
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      log.warning(
        `API error, retrying (attempt ${retryCount + 1}/${MAX_RETRIES})`
      );
      return extractInfoWithLLM(text, retryCount + 1);
    }
    log.error(
      `Error using LLM for extraction after ${MAX_RETRIES} retries: ${error}`
    );
    throw error;
  }
}
