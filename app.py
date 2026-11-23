"""Vox Fonoaudiologia – backend Flask. Rodar: pip install -r requirements.txt && python app.py"""
import json, threading
from datetime import date, timedelta
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder="static", static_url_path="")
DB = Path(__file__).with_name("agendamentos.json")
LOCK = threading.Lock()
HORAS = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]

# queixa -> (id do serviço, explicação)
TRIAGEM = {
    "fala": ("fala-linguagem", "Atraso ou troca de sons e palavras costumam responder bem à terapia de fala e linguagem."),
    "voz": ("voz", "Rouquidão e cansaço vocal pedem avaliação da voz e orientação de uso."),
    "gagueira": ("fluencia", "A terapia de fluência trabalha ritmo, tensão e confiança ao falar."),
    "degluticao": ("degluticao", "Engasgos e dificuldade para mastigar exigem avaliação da deglutição."),
    "leitura": ("aprendizagem", "Dificuldade para ler e escrever pode estar ligada à linguagem. Vale uma avaliação."),
}

def ler():
    return json.loads(DB.read_text("utf-8")) if DB.exists() else []

def livres(dia):
    ocupados = {a["hora"] for a in ler() if a["data"] == dia}
    return [h for h in HORAS if h not in ocupados]

@app.get("/")
def index():
    return send_from_directory("static", "index.html")

@app.get("/api/dias")
def dias():
    out, d = [], date.today()
    while len(out) < 7:
        d += timedelta(days=1)
        if d.weekday() < 5:
            out.append(d.isoformat())
    return jsonify(out)

@app.get("/api/horarios")
def horarios():
    return jsonify(livres(request.args.get("data", "")))

@app.post("/api/triagem")
def triagem():
    d = request.get_json(force=True)
    sid, msg = TRIAGEM.get(d.get("queixa"), ("avaliacao", "Uma avaliação inicial identifica o melhor caminho."))
    if d.get("perfil") == "crianca":
        msg += " Para crianças, a sessão é feita com atividades lúdicas."
    return jsonify({"servico": sid, "mensagem": msg})

@app.post("/api/agendar")
def agendar():
    d = request.get_json(force=True)
    for campo in ("nome", "contato", "servico", "data", "hora"):
        if not str(d.get(campo, "")).strip():
            return jsonify(erro=f"Preencha o campo {campo}."), 400
    with LOCK:
        if d["hora"] not in livres(d["data"]):
            return jsonify(erro="Esse horário acabou de ser reservado. Escolha outro."), 409
        DB.write_text(json.dumps(ler() + [d], ensure_ascii=False, indent=2), "utf-8")
    return jsonify(ok=True)

if __name__ == "__main__":
    app.run(debug=True)
