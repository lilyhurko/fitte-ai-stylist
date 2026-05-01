import os
import io
import json
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from rembg import remove
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv
from pillow_heif import register_heif_opener

register_heif_opener()
load_dotenv(dotenv_path="../server/.env")

genai.configure(api_key=os.getenv("GEMINI_API_KEY"), transport='rest')

app = FastAPI()

def get_available_model():
    try:
        models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        priority_list = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]
        for priority in priority_list:
            for m in models:
                if priority in m: return m
        return models[0] if models else "models/gemini-flash-latest"
    except Exception: return "models/gemini-flash-latest"

AVAILABLE_MODEL = get_available_model()
print(f"Używam modelu: {AVAILABLE_MODEL}")

@app.post("/process-clothing")
async def process_clothing(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        input_image = Image.open(io.BytesIO(image_bytes))
        
        output_image = remove(input_image)

        ai_image = output_image.convert("RGB")
        ai_image.thumbnail((1024, 1024)) 
        
        model = genai.GenerativeModel(AVAILABLE_MODEL)
        prompt = """
        Analizuj to ubranie. Podaj krótką nazwę, kategorię (Góra, Dół, Sukienki, Obuwie) 
        i styl (Minimalizm, Boho, Classic, Streetwear). 
        Zwróć wynik WYŁĄCZNIE jako czysty JSON: 
        {"name": "...", "category": "...", "style": "..."}
        """
        
        response = model.generate_content([prompt, ai_image])
        
        raw_text = response.text.strip().replace("```json", "").replace("```", "")        
        try:
            parsed_json = json.loads(raw_text)
            safe_json = json.dumps(parsed_json, ensure_ascii=True)
        except:
            safe_json = json.dumps({"name": "Ubranie", "category": "Góra", "style": "Classic"})

        print(f"✅ Sukces: {safe_json}")

        img_output = io.BytesIO()
        output_image.save(img_output, format='PNG')
        img_output.seek(0)

        return StreamingResponse(
            img_output, 
            media_type="image/png", 
            headers={"X-AI-Analysis": safe_json}
        )

    except Exception as e:
        print(f" BŁĄD AI SERVICE: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)