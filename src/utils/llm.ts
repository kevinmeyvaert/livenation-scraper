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

const EXTRACTION_PROMPT = `Extract concert dates, locations, and contact information from the following text.
Return the information in this exact JSON format:
{
  "events": [
    {
      "date": "DD month YYYY",
      "location": "Venue Name, City"
    },
    ...
  ],
  "contact": {
    "name": "Full Name",
    "email": "email@address"
  }
}

Rules for extraction:
1. Each unique date-location combination should be a separate event in the events array
2. Dates should be in the format "DD month YYYY" (e.g., "24 juni 2025")
3. Location should ONLY include the venue name and city, separated by comma (e.g., "Vorst Nationaal, Brussel")
4. Only include confirmed dates and locations
5. For locations, only extract actual venue names (like "Vorst Nationaal", "Ancienne Belgique", "La Madeleine", etc.) and cities (like "Brussel", "Antwerpen")
6. Do NOT include any descriptive text or narrative in the location field
7. Standardize city names to "Brussel" and "Antwerpen"
8. For contact information:
   - Look for these exact patterns:
     * "Voor meer informatie kunt u contact opnemen met: [Name]" or similar Dutch phrases
     * "Contact: [Name]" or "Perscontact: [Name]"
     * "Voor persvragen: [Name]"
   - If these patterns are not found, look for the role of the contact in the text (e.g. Asst. booker/promoter, Marcom manager, Marketing & Communication Manager or similar)
   - Look for email addresses near contact names
   - Check for contact information in footers or contact sections
   - ONLY include contact information if it's specifically for press/media contacts
   - If no clear press contact is found, omit the contact field entirely
9. Email addresses should be complete and properly formatted
10. The detail pages usually have text that starts with the date and location of publication of the article, this is usually marked in an <em> tag. And usually this location is Mechelen. This is not the date, nor the location of the concert, so ignore it.

Example good output with multiple events and contact:
{
  "events": [
    {
      "date": "26 maart 2026",
      "location": "Koninklijk Circus, Brussel"
    },
    {
      "date": "27 maart 2026",
      "location": "De Roma, Antwerpen"
    }
  ],
  "contact": {
    "name": "John Smith",
    "email": "john.smith@livenation.be"
  }
}

Example good output with single event and no contact:
{
  "events": [
    {
      "date": "24 juni 2025",
      "location": "Vorst Nationaal, Brussel"
    }
  ]
}

Example bad output (too much narrative text):
{
  "events": [
    {
      "date": "24 juni 2025",
      "location": "komt naar Vorst Nationaal in Brussel voor een spetterend concert"
    }
  ],
  "contact": {
    "name": "Voor meer informatie kunt u contact opnemen met Kaat",
    "email": "email hieronder: kaat.bosch@livenation.be"
  }
}

Text to analyze:`;

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
      temperature: 0, // Use 0 temperature for maximum consistency
      max_tokens: 1000, // Increase token limit for better context
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
