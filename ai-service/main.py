import os
import io
import json
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from rembg import remove, new_session 
from PIL import Image
from google import genai  
from dotenv import load_dotenv
from pillow_heif import register_heif_opener

register_heif_opener()
load_dotenv(dotenv_path="../server/.env")

client = genai.Client()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-AI-Analysis"] 
)

print(" Ładowanie modelu u2netp dla rembg...")
SESSION_REMBG = new_session(model_name="u2netp") 

def get_available_model():
    try:
        models = [m.name for m in client.models.list() if 'generateContent' in m.supported_actions]
        priority_list = ["gemini-2.5-flash", "gemini-1.5-flash"]
        for priority in priority_list:
            for m in models:
                if priority in m: return m
        return "gemini-2.5-flash"
    except Exception: 
        return "gemini-2.5-flash"

AVAILABLE_MODEL = get_available_model()
print(f" Fitte AI startuje na modelu: {AVAILABLE_MODEL}")

@app.post("/process-image")
async def process_image(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        input_image = Image.open(io.BytesIO(image_bytes))
        
        output_image = remove(input_image, session=SESSION_REMBG)
        
        ai_image = output_image.convert("RGB")
        ai_image.thumbnail((600, 600)) 
        
        prompt = """
        Analizuj to ubranie na obrazku (który ma usunięte tło). 
        Podaj krótką nazwę, kategorię (Góra, Dół, Sukienki, Obuwie), 
        styl (Minimalizm, Boho, Classic, Streetwear) 
        oraz dominujący kolor ubrania (np. błękitny, czarny, pastelowy róż).
        
        Zwróć wynik WYŁĄCZNIE jako czysty JSON: 
        {"name": "...", "category": "...", "style": "...", "color": "..."}
        """
        
        response = client.models.generate_content(
            model=AVAILABLE_MODEL,
            contents=[prompt, ai_image]
        )
        
        raw_text = response.text.strip().replace("```json", "").replace("```", "")        
        try:
            parsed_json = json.loads(raw_text)
            safe_json = json.dumps(parsed_json, ensure_ascii=False)
        except:
            safe_json = json.dumps({"name": "Nowe ubranie", "category": "Góra", "style": "Classic", "color": "Nieokreślony"}, ensure_ascii=False)

        print(f" AI przeanalizowało pomyślnie: {safe_json}")

        img_output = io.BytesIO()
        output_image.save(img_output, format='PNG', optimize=True)
        img_output.seek(0)

        safe_json_encoded = safe_json.encode('utf-8').decode('latin-1')

        return StreamingResponse(
            img_output, 
            media_type="image/png", 
            headers={"X-AI-Analysis": safe_json_encoded}
        )

    except Exception as e:
        print(f"  BŁĄD AI SERVICE: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/")
def health_check():
    return {"status": "healthy", "service": "Fitte AI Service"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 7860)) 
    uvicorn.run(app, host="0.0.0.0", port=port)