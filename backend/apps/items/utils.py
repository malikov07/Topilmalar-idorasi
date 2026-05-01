import os
import json
import base64
from openai import OpenAI

# TODO: REPLACE THIS WITH YOUR REAL OPENAI SK- KEY
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def analyze_item_image(image_path):
    print("Sending image to OpenAI GPT-4o mini...")
    
    if not os.path.exists(image_path):
        print(f"Error: File '{image_path}' not found.")
        return {}

    # Encode the image to base64
    base64_image = encode_image(image_path)

    # Prompt designed for strict category suggestion + safety moderation
    system_prompt = """
    You are an AI categorizer and safety moderator for a Lost and Found platform.
    Analyze the image and return exactly this valid JSON format:
    {
      "is_safe": true,
      "reject_reason": null,
      "suggested_categories": ["Electronics", "Headphones"]
    }
    If the image contains violence, pornography, real weapons, or extreme gore, return "is_safe": false and provide a short English statement in "reject_reason" explaining why.
    Otherwise, return "is_safe": true and a list of up to 3 main single-word nouns as suggested categories (e.g. "Smartphone", "Wallet", "Keys"). Do NOT include adjectives in the category names.
    Respond ONLY in valid JSON. No markdown formatting, no code blocks, no other text.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this lost/found item."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "low" # Forces the $0.0001 ultra-low price!
                            }
                        }
                    ]
                }
            ],
            max_tokens=300
        )

        content = response.choices[0].message.content.strip()
        
        # Clean up any accidental markdown the model might return
        if content.startswith('```json'):
            content = content.replace('```json', '', 1).replace('```', '', 1).strip()
            
        print("OpenAI Response:", content)
        result = json.loads(content)
        return result

    except Exception as e:
        print(f"OpenAI API Error: {str(e)}")
        # Return safe default structure on error - MUST match frontend expectations!
        return {
            "is_safe": True,
            "reject_reason": None,
            "suggested_categories": []
        }

if __name__ == "__main__":
    print(analyze_item_image(r"C:\Users\Malikov\Desktop\projects\ai-category\images.jpg"))