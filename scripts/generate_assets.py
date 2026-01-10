#!/usr/bin/env python3
"""
THE CHICKEN MUST ARRIVE - Asset Generation Script
=================================================
Uses Imagen 3 to generate all game assets.

SETUP:
1. Install dependencies:
   pip install google-genai Pillow

2. Set your API key:
   export GEMINI_API_KEY=your_api_key_here

3. Run the script:
   python generate_assets.py

Get API key from: https://aistudio.google.com/app/apikey
"""

import os
import sys
from io import BytesIO
from pathlib import Path

try:
    from google import genai
    from google.genai import types
    from PIL import Image
except ImportError:
    print("Missing dependencies! Run:")
    print("  pip install google-genai Pillow")
    sys.exit(1)

# =============================================================================
# CONFIGURATION
# =============================================================================

API_KEY = os.environ.get('GEMINI_API_KEY')
if not API_KEY:
    print("ERROR: GEMINI_API_KEY environment variable not set!")
    print("Run: export GEMINI_API_KEY=your_api_key_here")
    sys.exit(1)

# Output directories
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "assets"
CHARACTERS_DIR = OUTPUT_DIR / "characters"
LOCATIONS_DIR = OUTPUT_DIR / "locations"
ITEMS_DIR = OUTPUT_DIR / "items"

# Create directories
CHARACTERS_DIR.mkdir(parents=True, exist_ok=True)
LOCATIONS_DIR.mkdir(parents=True, exist_ok=True)
ITEMS_DIR.mkdir(parents=True, exist_ok=True)

# =============================================================================
# STYLE CONSTANTS
# =============================================================================

STYLE_PREFIX = """
Pixel art character portrait, 64x64 resolution,
retro video game aesthetic, vibrant saturated colors,
clean pixel edges, no antialiasing, white solid background,
cute chibi proportions, expressive face,
Singapore hawker culture style, warm lighting,
consistent with 16-bit era game sprites
"""

STYLE_SUFFIX = """
, high quality pixel art, game asset style,
centered composition, full character visible,
no text, no watermarks, clean edges
"""

LOCATION_STYLE_PREFIX = """
Pixel art scene, 256x128 resolution,
retro video game background aesthetic,
vibrant colors, clean pixel edges,
Singapore cityscape style, atmospheric
"""

# =============================================================================
# CHARACTER PROMPTS
# =============================================================================

CHARACTERS = {
    # ===== THE CHICKEN (PRIORITY 1) =====
    "chicken_neutral": f"""{STYLE_PREFIX}
white cream colored chicken bird,
red ceremonial silk ribbon tied around neck,
standing in proud regal posture,
judgmental side-eye expression looking at viewer,
one eyebrow raised skeptically,
fluffy feathers, red comb on head,
important ceremonial chicken appearance,
main character energy
{STYLE_SUFFIX}""",

    "chicken_happy": f"""{STYLE_PREFIX}
white cream colored chicken bird,
red ceremonial silk ribbon tied around neck,
happy excited hopping pose,
big smile with closed happy eyes,
small sparkles around head,
wings slightly spread in joy,
fluffy feathers, red comb on head,
adorable happy chicken appearance
{STYLE_SUFFIX}""",

    "chicken_angry": f"""{STYLE_PREFIX}
white cream colored chicken bird,
red ceremonial silk ribbon tied around neck,
angry aggressive pose, feathers puffed up,
furious glaring eyes, angry eyebrows,
beak open as if squawking angrily,
red angry aura around chicken,
fluffy feathers standing on end,
very angry chicken appearance
{STYLE_SUFFIX}""",

    "chicken_sad": f"""{STYLE_PREFIX}
white cream colored chicken bird,
red ceremonial silk ribbon tied around neck,
sad drooping pose, head tilted down,
big teary eyes with single tear drop,
dejected disappointed expression,
wings drooped at sides,
fluffy feathers, red comb on head,
very sad betrayed chicken appearance
{STYLE_SUFFIX}""",

    # ===== AUNTIE MEI MEI (PRIORITY 2) =====
    "auntie_mei_angry": f"""{STYLE_PREFIX}
elderly Chinese Singaporean woman, age 60,
short curly permed hair in gray-black color,
wearing bright floral blouse with pink and red flowers,
white cooking apron with small stains,
holding a metal spatula pointed forward accusingly,
angry furrowed eyebrows, frowning mouth,
one hand on hip in scolding pose,
red flush on cheeks from anger,
round face, small gold earrings,
hawker center cook appearance
{STYLE_SUFFIX}""",

    "auntie_mei_neutral": f"""{STYLE_PREFIX}
elderly Chinese Singaporean woman, age 60,
short curly permed hair in gray-black color,
wearing bright floral blouse with pink and red flowers,
white cooking apron with small stains,
holding a metal spatula in right hand,
warm motherly smile, slightly raised eyebrows,
round face with rosy cheeks,
small gold earrings,
hawker center cook appearance
{STYLE_SUFFIX}""",

    "auntie_mei_happy": f"""{STYLE_PREFIX}
elderly Chinese Singaporean woman, age 60,
short curly permed hair in gray-black color,
wearing bright floral blouse with pink and red flowers,
white cooking apron with small stains,
holding a plate of chicken rice,
big warm smile showing teeth, eyes closed happily,
waving hand in welcoming gesture,
round face with rosy cheeks,
small gold earrings,
hawker center cook appearance
{STYLE_SUFFIX}""",

    # ===== GRAB UNCLE MUTHU =====
    "grab_uncle_neutral": f"""{STYLE_PREFIX}
middle-aged Indian Singaporean man, age 55,
receding hairline with slight gray hair,
neat trimmed black and gray mustache,
wearing neat blue polo shirt,
friendly warm smile, wise kind eyes,
slightly chubby build, round face,
one hand raised in casual greeting gesture,
taxi driver uncle appearance,
gold wedding ring on finger
{STYLE_SUFFIX}""",

    "grab_uncle_shocked": f"""{STYLE_PREFIX}
middle-aged Indian Singaporean man, age 55,
receding hairline with slight gray hair,
neat trimmed black and gray mustache,
wearing neat blue polo shirt,
shocked surprised expression, wide eyes,
eyebrows raised high, mouth open in O shape,
both hands up in surprise gesture,
slightly chubby build, round face,
taxi driver uncle appearance
{STYLE_SUFFIX}""",

    # ===== AH BENG =====
    "ah_beng_neutral": f"""{STYLE_PREFIX}
young Chinese Singaporean man, age 25,
short spiky black hair with slightly lighter tips,
wearing green army singlet tank top,
fit athletic muscular build,
confident smirk, one eyebrow raised,
silver chain necklace,
arms slightly crossed showing muscles,
bro energy cool guy expression,
youthful energetic appearance
{STYLE_SUFFIX}""",

    "ah_beng_excited": f"""{STYLE_PREFIX}
young Chinese Singaporean man, age 25,
short spiky black hair with slightly lighter tips,
wearing green army singlet tank top,
fit athletic muscular build,
big excited grin, eyes wide with enthusiasm,
both fists pumped up in excitement,
silver chain necklace,
bro energy hype expression,
youthful energetic appearance
{STYLE_SUFFIX}""",

    # ===== JESSICA =====
    "jessica_angry": f"""{STYLE_PREFIX}
young Chinese Singaporean professional woman, age 30,
neat black hair in tight ponytail,
wearing wireless earpiece headset,
professional white blouse and blazer,
holding smartphone in one hand,
angry stressed expression, furrowed brows,
mouth open as if yelling into phone,
veins visible on forehead from stress,
wedding planner professional appearance
{STYLE_SUFFIX}""",

    "jessica_relieved": f"""{STYLE_PREFIX}
young Chinese Singaporean professional woman, age 30,
neat black hair in tight ponytail,
wearing wireless earpiece headset,
professional white blouse and blazer,
holding clipboard with checklist,
relieved expression, tears of joy in eyes,
hand on chest in relief gesture,
exhausted but happy smile,
wedding planner professional appearance
{STYLE_SUFFIX}""",

    # ===== AIRPORT AUNTIE =====
    "airport_auntie": f"""{STYLE_PREFIX}
middle-aged Malay Singaporean woman, age 50,
wearing light blue hijab headscarf,
airport cleaning staff uniform in blue,
holding mop handle,
concerned caring expression, worried eyebrows,
kind eyes looking at viewer with worry,
gentle motherly face,
name tag on uniform,
airport worker appearance
{STYLE_SUFFIX}""",

    # ===== SECURITY GUARD =====
    "security_guard": f"""{STYLE_PREFIX}
middle-aged Singaporean security guard man, age 45,
wearing formal black security uniform,
peaked cap with security badge,
stern professional expression,
arms crossed in blocking pose,
walkie talkie on shoulder,
authoritative but fair appearance,
hotel security guard look
{STYLE_SUFFIX}""",

    # ===== MARCUS (GROOM) =====
    "marcus_happy": f"""{STYLE_PREFIX}
young Chinese Singaporean man, age 28,
wearing formal black wedding tuxedo,
white boutonniere flower on lapel,
big emotional happy smile, teary eyes,
arms open wide in welcoming hug gesture,
neat styled black hair,
handsome groom appearance,
emotional gratitude expression
{STYLE_SUFFIX}""",
}

# =============================================================================
# LOCATION PROMPTS
# =============================================================================

LOCATIONS = {
    "changi_airport": f"""{LOCATION_STYLE_PREFIX}
pixel art scene of Singapore Changi Airport interior,
modern terminal with high ceiling,
departure boards and palm trees,
bright clean lighting,
airport benches and shops visible,
no people, empty scene,
travel destination atmosphere
{STYLE_SUFFIX}""",

    "maxwell_food_centre": f"""{LOCATION_STYLE_PREFIX}
pixel art scene of Singapore hawker center,
crowded food stalls with Chinese signage,
plastic chairs and round tables,
steaming food displays,
colorful lights and fans,
no people, atmospheric scene,
hawker center food court atmosphere
{STYLE_SUFFIX}""",

    "cbd_raffles": f"""{LOCATION_STYLE_PREFIX}
pixel art scene of Singapore CBD skyline,
tall modern glass skyscrapers,
busy road with cars and buses,
MRT station entrance visible,
clean urban business district,
no people, city scene,
financial district atmosphere
{STYLE_SUFFIX}""",

    "east_coast_park": f"""{LOCATION_STYLE_PREFIX}
pixel art scene of Singapore East Coast Park,
beach with palm trees,
cycling path and BBQ pits,
ocean view in background,
relaxed coastal atmosphere,
no people, scenic view,
beach park atmosphere
{STYLE_SUFFIX}""",

    "marina_bay_sands": f"""{LOCATION_STYLE_PREFIX}
pixel art scene of Marina Bay Sands hotel,
iconic three towers with rooftop ship,
water fountain in foreground,
night lights and reflections,
grand luxurious atmosphere,
no people, landmark view,
wedding venue atmosphere
{STYLE_SUFFIX}""",
}

# =============================================================================
# GENERATION FUNCTIONS
# =============================================================================

def generate_image(prompt: str, filename: str, output_dir: Path, size: tuple = (64, 64)):
    """Generate a single image using Imagen 3."""
    client = genai.Client(api_key=API_KEY)

    print(f"  Generating: {filename}...")

    try:
        response = client.models.generate_images(
            model='imagen-3.0-generate-002',
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=2,  # Generate 2 variations
                aspect_ratio="1:1",
                safety_filter_level="block_medium_and_above",
                person_generation="allow_adult"
            )
        )

        for i, generated_image in enumerate(response.generated_images):
            image = Image.open(BytesIO(generated_image.image.image_bytes))
            # Resize to exact dimensions
            image = image.resize(size, Image.Resampling.NEAREST)
            output_path = output_dir / f"{filename}_{i}.png"
            image.save(output_path)
            print(f"    Saved: {output_path.name}")

        return True

    except Exception as e:
        print(f"    ERROR: {e}")
        return False


def generate_all_characters():
    """Generate all character sprites."""
    print("\n" + "="*50)
    print("GENERATING CHARACTERS")
    print("="*50)

    success_count = 0
    for name, prompt in CHARACTERS.items():
        if generate_image(prompt, name, CHARACTERS_DIR, size=(64, 64)):
            success_count += 1

    print(f"\nCharacters: {success_count}/{len(CHARACTERS)} generated")
    return success_count


def generate_all_locations():
    """Generate all location backgrounds."""
    print("\n" + "="*50)
    print("GENERATING LOCATIONS")
    print("="*50)

    success_count = 0
    for name, prompt in LOCATIONS.items():
        if generate_image(prompt, name, LOCATIONS_DIR, size=(256, 128)):
            success_count += 1

    print(f"\nLocations: {success_count}/{len(LOCATIONS)} generated")
    return success_count


def generate_priority_assets():
    """Generate only the most important assets first."""
    print("\n" + "="*50)
    print("GENERATING PRIORITY ASSETS ONLY")
    print("="*50)

    priority = [
        "chicken_neutral",
        "chicken_angry",
        "chicken_happy",
        "chicken_sad",
        "auntie_mei_angry",
        "auntie_mei_neutral",
        "grab_uncle_neutral",
        "ah_beng_neutral",
    ]

    success_count = 0
    for name in priority:
        if name in CHARACTERS:
            if generate_image(CHARACTERS[name], name, CHARACTERS_DIR, size=(64, 64)):
                success_count += 1

    print(f"\nPriority assets: {success_count}/{len(priority)} generated")
    return success_count


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║      THE CHICKEN MUST ARRIVE - Asset Generator            ║
    ║                   Using Imagen 3                          ║
    ╚═══════════════════════════════════════════════════════════╝
    """)

    print(f"Output directory: {OUTPUT_DIR}")
    print(f"API Key: {'✓ Set' if API_KEY else '✗ Missing'}")

    if len(sys.argv) > 1:
        if sys.argv[1] == "--priority":
            generate_priority_assets()
        elif sys.argv[1] == "--characters":
            generate_all_characters()
        elif sys.argv[1] == "--locations":
            generate_all_locations()
        elif sys.argv[1] == "--help":
            print("""
Usage:
  python generate_assets.py              Generate ALL assets
  python generate_assets.py --priority   Generate priority assets only (chicken + main NPCs)
  python generate_assets.py --characters Generate characters only
  python generate_assets.py --locations  Generate locations only
  python generate_assets.py --help       Show this help
            """)
        else:
            print(f"Unknown option: {sys.argv[1]}")
            print("Run with --help for usage")
    else:
        # Generate everything
        generate_all_characters()
        generate_all_locations()

    print("\n" + "="*50)
    print("DONE!")
    print("="*50)
    print(f"Assets saved to: {OUTPUT_DIR}")
    print("\nNext steps:")
    print("1. Review generated images")
    print("2. Pick the best variation for each asset")
    print("3. Rename to remove the _0 or _1 suffix")
    print("4. The game will use these from public/assets/")


if __name__ == "__main__":
    main()
