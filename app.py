from flask import Flask, render_template, request, jsonify
import sqlite3, datetime, re
from pathlib import Path
app=Flask(__name__)
DB=Path(__file__).with_name('consultas.db')
SERVICOS=['Linguagem infantil','Voz profissional','Motricidade orofacial','Fala e comunicação','Audiologia','Avaliação fonoaudiológica']
def init():
    with sqlite3.connect(DB) as c:
        c.execute('CREATE TABLE IF NOT EXISTS consultas (id INTEGER PRIMARY KEY, nome TEXT, email TEXT, telefone TEXT, servico TEXT, data TEXT, horario TEXT, status TEXT DEFAULT "pendente")')
init()
@app.get('/')
def home(): return render_template('index.html')
@app.post('/api/consultas')
def consulta():
    d=request.get_json(silent=True) or {}
    keys=['nome','email','telefone','servico','data','horario']
    if any(not isinstance(d.get(k),str) or not d[k].strip() or len(d[k])>200 for k in keys): return jsonify(erro='Preencha todos os campos.'),400
    try:
        assert datetime.date.fromisoformat(d['data'])>=datetime.date.today()
        assert d['horario'] in ['09:00','10:30','14:00','15:30','17:00']
        assert d['servico'] in SERVICOS and re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+',d['email'])
    except (ValueError,AssertionError): return jsonify(erro='Confira os dados informados.'),400
    with sqlite3.connect(DB) as c:
        cur=c.execute('INSERT INTO consultas (nome,email,telefone,servico,data,horario) VALUES (?,?,?,?,?,?)',[d[k].strip() for k in keys]); id=cur.lastrowid
    return jsonify(protocolo=f'ES-{id:05d}'),201
if __name__=='__main__': app.run(debug=False)
