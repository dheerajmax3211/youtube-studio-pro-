import os, urllib.request, json

api_key = os.getenv("OPENROUTER_API_KEY", "")
url = "https://openrouter.ai/api/v1/chat/completions"

prompt = """You are an elite short-form video director (specializing in viral YouTube Shorts & Reels).
Topic: "Horrifying facts about our ocean"
Target Duration: 60 seconds (approx 135-150 spoken words).

Create a high-retention video script and dynamic visual beats.
DO NOT use hardcoded fitness or template themes. Tailor EVERYTHING to the topic.

Return ONLY a JSON object with this exact structure:
{
  "title": "Title of Video",
  "tagline": "UPPERCASE CATEGORY (e.g. DEEP OCEAN HORRORS)",
  "paragraphs": [
    "Narration paragraph 1...",
    "Narration paragraph 2...",
    "Narration paragraph 3...",
    "Narration paragraph 4..."
  ],
  "theme": {
    "name": "Abyssal Horror",
    "background_css": "radial-gradient(ellipse at 50% 20%, #06192E 0%, #020813 60%, #01040A 100%)",
    "ambient_glow_1": "radial-gradient(circle, rgba(0, 242, 254, 0.2) 0%, transparent 70%)",
    "ambient_glow_2": "radial-gradient(circle, rgba(255, 42, 109, 0.15) 0%, transparent 65%)",
    "accent_primary": "#00F2FE",
    "accent_secondary": "#FF2A6D",
    "card_bg": "rgba(4, 18, 36, 0.8)",
    "card_border": "1px solid rgba(0, 242, 254, 0.3)",
    "card_glow": "0 20px 60px rgba(0, 242, 254, 0.15)",
    "caption_highlight": "#00F2FE",
    "vibe_pattern": "ocean_sonar"
  },
  "beats": [
    {
      "type": "stat_hero",
      "eyebrow": "UNKNOWN TERRITORY",
      "number": "95%",
      "unit": "UNEXPLORED",
      "label": "OF OUR OCEANS REMAIN A COMPLETE MYSTERY",
      "subtitle": "We have better maps of Mars than our own seabed."
    },
    {
      "type": "classified_dossier",
      "eyebrow": "CLASSIFIED RECORD #084",
      "badge": "CRUSHING DEPTH",
      "title": "THE HADAL ZONE",
      "location": "MARIANA TRENCH · 36,000 FT",
      "bullets": [
        "1,000 atmospheres of crushing pressure",
        "Total light extinction below 1,000 meters",
        "Unknown apex biological signatures detected"
      ]
    },
    {
      "type": "sonar_scan",
      "eyebrow": "HYDROPHONE ANOMALY",
      "target": "THE BLOOP ACOUSTIC EVENT",
      "depth": "10,984 METERS",
      "frequency": "ULTRA-LOW 50 HZ",
      "finding": "Sound detected across 5,000 km in 1997"
    },
    {
      "type": "ranked_item",
      "eyebrow": "ABYSSAL PREDATOR",
      "rank": "01",
      "title": "BARRELEYE FISH",
      "danger_score": "EXTREME ADAPTATION",
      "description": "Transparent dome head with rotating glowing emerald eyes."
    },
    {
      "type": "kinetic_slam",
      "eyebrow": "THE REAL HORROR",
      "headline": "NOT WHAT IS MISSING",
      "highlight_word": "WHAT IS WAITING",
      "punchline": "DOWN IN THE DARK"
    },
    {
      "type": "split_contrast",
      "eyebrow": "PRESSURE COMPARISON",
      "left_title": "SURFACE LEVEL",
      "left_text": "1 ATM · Gentle breathable pressure",
      "right_title": "MARIANA BOTTOM",
      "right_text": "1,086 ATM · Equivalent to 50 jumbo jets on your head"
    },
    {
      "type": "data_grid",
      "eyebrow": "CRITICAL ENVIRONMENTAL METRICS",
      "title": "OCEAN EXTREMES",
      "metrics": [
        {"label": "Max Depth", "value": "11,034 m"},
        {"label": "Water Temp", "value": "1°C - 4°C"},
        {"label": "Sunlight Cutoff", "value": "200 m"},
        {"label": "Unknown Species", "value": "2,000,000+"}
      ]
    }
  ]
}

Available beat types you MUST choose from to match each moment of the script:
- 'stat_hero': huge number, unit, label, subtitle
- 'classified_dossier': eyebrow, badge, title, location, bullets array
- 'sonar_scan': eyebrow, target, depth, frequency, finding
- 'ranked_item': eyebrow, rank, title, danger_score, description
- 'kinetic_slam': eyebrow, headline, highlight_word, punchline
- 'split_contrast': eyebrow, left_title, left_text, right_title, right_text (ONLY when actually contrasting two concepts)
- 'data_grid': eyebrow, title, metrics array [{label, value}]

Generate between 8 and 14 beats so the screen dynamically changes every 3-5 seconds. Match the vibe_pattern to one of: 'ocean_sonar', 'cyber_grid', 'bio_hazard', 'space_cosmos', 'modern_minimal'."""

req = urllib.request.Request(
    url,
    data=json.dumps({
        'model': 'google/gemini-2.5-flash',
        'messages': [{'role': 'user', 'content': prompt}],
        'response_format': {'type': 'json_object'}
    }).encode('utf-8'),
    headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
)

with urllib.request.urlopen(req) as res:
    data = json.loads(res.read())
    content = json.loads(data['choices'][0]['message']['content'])
    print("Generated title:", content.get("title"))
    print("Theme:", content.get("theme", {}).get("name"))
    print("Total beats:", len(content.get("beats", [])))
    print("Beat types:", [b.get("type") for b in content.get("beats", [])])
