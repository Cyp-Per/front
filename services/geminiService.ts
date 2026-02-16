import { GoogleGenAI } from "@google/genai";
import { DASHBOARD_SUMMARY, COUNTRY_GROUPS } from '../constants';

const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
}

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getDashboardInsights = async (query: string, language: string = 'en'): Promise<string> => {
  if (!ai) return "API Key is missing.";

  try {
    const prompt = `
      You are an intelligent data analyst assistant.
      Context: ${DASHBOARD_SUMMARY}
      User Question: ${query}
      Language: Respond in ${language === 'fr' ? 'French' : 'English'}.
      Keep it concise.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No insights available.";
  } catch (error) {
    return "Connection error.";
  }
};

export const processMatrixRules = async (prompt: string, columns: any[], language: string = 'en'): Promise<any[]> => {
  if (!ai) throw new Error("API Key is missing");

  try {
    const columnStructure = columns.map(c => ({ id: c.id, name: c.name, type: c.type, options: c.options }));
    const countryGroupContext = JSON.stringify(COUNTRY_GROUPS);

    const systemPrompt = `
      You are a specialized data entry assistant.
      Language: Interpret the request in ${language === 'fr' ? 'French' : 'English'}.
      
      Table Columns:
      ${JSON.stringify(columnStructure)}

      Reference for Country Groups:
      ${countryGroupContext}
      
      User Request: "${prompt}"
      
      Instructions:
      1. Analyze the request to determine if it's adding NEW rules or UPDATING existing ones.
      2. If updating, define the 'criteria' to match rows (e.g. Country="USA").
      3. EXHAUSTIVENESS: If user mentions a group (like "EU"), generate individual actions for every member country.
      4. Return ONLY a valid JSON ARRAY of Action Objects.

      Schema:
      [
        {
          "action": "CREATE",
          "values": { "col_id": "value", "col_id_2": "value" }
        },
        {
          "action": "UPDATE",
          "criteria": { "col_id": "value_to_match" }, 
          "values": { "col_id_to_update": "new_value" }
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text || "[]";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);
    
    return Array.isArray(result) ? result : [result];
  } catch (error) {
    console.error("Gemini Matrix Error:", error);
    throw error;
  }
};

export const simulateMatrixResult = async (userScenario: string, columns: any[], rows: any[], language: string = 'en'): Promise<any> => {
  if (!ai) return { error: "API Key is missing" };

  try {
    const context = {
      columns: columns.map(c => c.name),
      rules: rows,
    };

    const prompt = `
      You are a Tax Logic Simulator.
      Language: Output the 'final_result' string in ${language === 'fr' ? 'French' : 'English'}.

      Logic Matrix Columns: ${JSON.stringify(context.columns)}
      Logic Matrix Rules: ${JSON.stringify(context.rules)}
      Special Country Logic: EU=27 members, FR (inc DOM)=France+DOM.

      User Scenario: "${userScenario}"

      Task:
      1. Analyze scenario.
      2. Match against rules.
      3. Populate 'missing_info' if needed.
      4. Populate 'all_outputs' with every output column value found.
      5. Return JSON:
      {
        "identified_context": { "Column Name": "Value" },
        "all_outputs": { "Output Column Name": "Value" },
        "final_result": "Summary string in ${language}",
        "match_found": true/false,
        "missing_info": ["Col1"],
        "error": null
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    return { error: "Error running simulation." };
  }
};

export const parseDeliveryCases = async (userDescription: string, inputColumns: any[], language: string = 'en'): Promise<any[]> => {
  if (!ai) throw new Error("API Key missing");

  try {
    const colStructure = inputColumns.map(c => ({ id: c.id, name: c.name, options: c.options }));
    
    const prompt = `
      Extract delivery cases from text.
      Language context: ${language === 'fr' ? 'French' : 'English'}.
      
      Columns:
      ${JSON.stringify(colStructure)}

      User Description: "${userDescription}"

      Return ONLY JSON Array of input objects.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text || "[]";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    return [];
  }
};

export const analyzeInvoice = async (base64Data: string, mimeType: string, language: string = 'en'): Promise<any> => {
  if (!ai) throw new Error("API Key is missing");

  try {
    const prompt = `
      Analyze this invoice image and extract data about the 'Private Copy Levy' (Rémunération Copie Privée / RCP / Sorecop / Copie France).

      CRITICAL INSTRUCTIONS:
      1. Look for 'Total HT', 'Hors Taxe Total' or 'Montant HT'.
      2. Look for 'Total TTC', 'Gross Amount'.
      3. Look for 'Private Copy Levy', 'Rémunération Copie Privée', 'RCP', 'Taxe Copie France'.
         - IF NOT FOUND explicitly in the lines or summary, 'privateCopyLevyAmount' MUST BE 0. Do not guess. Do not assume VAT is the levy.
      4. If there are multiple different products subject to the levy (e.g. an iPhone and an iPad), create separate entries in the 'lineItems' array.
      5. Extract the capacity (e.g., 64GB, 1TB) for each line item.

      Return ONLY raw JSON. No markdown.
      JSON Schema:
      {
        "sellerName": "...",
        "buyerName": "...",
        "sellerSiren": "...",
        "buyerSiren": "...",
        "totalHT": 0.00,
        "totalTTC": 0.00,
        "vatAmount": 0.00,
        "lineItems": [
           { 
             "description": "iPhone 13", 
             "type": "phone",  // phone, tablet, hardDrive, or other
             "capacity": "128GB", 
             "quantity": 2,
             "unitLevy": 14.00, // The levy amount per unit, if visible
             "totalLineLevy": 28.00 // The total levy for this line (unitLevy * quantity)
           }
        ]
      }
    `;

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    };
    
    const textPart = {
      text: prompt
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Invoice Analysis Error:", error);
    throw error;
  }
};
