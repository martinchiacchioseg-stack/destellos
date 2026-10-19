import datetime
import json
import os
import re
import sys
import uuid
import requests

# Forzar UTF-8 en stdout para terminales Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Cargar .env.local si existe en la raíz
env_local_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
if os.path.exists(env_local_path):
    with open(env_local_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

# ==============================================================================
# CONFIGURACIÓN GENERAL Y CREDENCIALES
# ==============================================================================
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "cc98f54bd6mshe3683466384e96fp12efc1jsndc0a7366d43f")
RAPIDAPI_HOST = "sportapi7.p.rapidapi.com"
SOFASCORE_BASE_URL = f"https://{RAPIDAPI_HOST}/api/v1"

# Liga Profesional de Fútbol AFA (Primera División)
UNIQUE_TOURNAMENT_ID = 155
SEASON_ID = 87913

# Base de Datos Triboo (Supabase)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hzysabgjbcypfydeigkh.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6eXNhYmdqYmN5cGZ5ZGVpZ2toIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIxMjk2OSwiZXhwIjoyMTA3Nzg4OTY5fQ.2te043w-UVmprA-cPwBfeICOofkw9mM_6V-ojWKVXyk")

# Backend de Triboo (Next.js)
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")

HEADERS_RAPIDAPI = {
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": RAPIDAPI_HOST
}

HEADERS_SUPABASE = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

ESCUDOS_CLUBES = {
    "Boca Juniors": "🟦🟨",
    "River Plate": "⚪🔴",
    "Racing Club": "⚪🩵",
    "Independiente": "🔴⚪",
    "San Lorenzo": "🔵🔴",
    "Estudiantes de La Plata": "🔴⚪",
    "Estudiantes L.P.": "🔴⚪",
    "Gimnasia y Esgrima": "🔵⚪",
    "Gimnasia L.P.": "🔵⚪",
    "Vélez Sarsfield": "🔵⚪",
    "Velez Sarsfield": "🔵⚪",
    "Huracán": "⚪🎈",
    "Huracan": "⚪🎈",
    "Rosario Central": "🟡🔵",
    "Newell's Old Boys": "🔴⚫",
    "Talleres": "🔵⚪",
    "Talleres Córdoba": "🔵⚪",
    "Belgrano": "🩵⚪",
    "Argentinos Juniors": "🔴⚪",
    "Argentinos Jrs": "🔴⚪",
    "Lanús": "🟤⚪",
    "CA Lanús": "🟤⚪",
    "Banfield": "🟢⚪",
    "Defensa y Justicia": "🟢🟡",
    "Godoy Cruz": "🔵⚪",
    "Platense": "🟤⚪",
    "Club Atlético Platense": "🟤⚪",
    "Tigre": "🔵🔴",
    "Unión": "🔴⚪",
    "Central Córdoba": "⚪⚫",
    "Barracas Central": "🔴⚪",
    "Instituto De Córdoba": "🔴⚪",
    "Deportivo Riestra": "⚫⚪",
    "Independiente Rivadavia": "🔵⚪",
    "Sarmiento": "🟢⚪"
}

def formatear_horario_argentino(timestamp):
    try:
        dt = datetime.datetime.fromtimestamp(timestamp, tz=datetime.timezone.utc)
        dt_arg = dt.astimezone(datetime.timezone(datetime.timedelta(hours=-3)))
        dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
        nombre_dia = dias[dt_arg.weekday()]
        return f"{nombre_dia} {dt_arg.strftime('%H:%M')} hs"
    except Exception:
        return "Horario a confirmar"

# ==============================================================================
# 1. PUBLICAR FIXTURE EN SUPABASE
# ==============================================================================
def publicar_fixture_automatico():
    print(f"\n[SUPABASE] Consultando calendario oficial de Liga Profesional...")
    url_rounds = f"{SOFASCORE_BASE_URL}/unique-tournament/{UNIQUE_TOURNAMENT_ID}/season/{SEASON_ID}/rounds"
    res_r = requests.get(url_rounds, headers=HEADERS_RAPIDAPI, timeout=10)
    if res_r.status_code != 200:
        print(f"[!] Error al obtener rondas: {res_r.status_code} {res_r.text}")
        return None

    r_data = res_r.json()
    numero_fecha = r_data.get("currentRound", {}).get("round", 14)
    print(f"-> Fecha oficial activa: Jornada {numero_fecha}")

    # Verificar si ya existe en Supabase
    try:
        check_url = f"{SUPABASE_URL}/rest/v1/prode_fechas?numero_fecha=eq.{numero_fecha}&select=id,estado"
        res_chk = requests.get(check_url, headers=HEADERS_SUPABASE)
        fechas_existentes = res_chk.json()
        if fechas_existentes:
            print(f"⚠️ La Fecha {numero_fecha} ya existe en Supabase (ID: {fechas_existentes[0]['id']}). Omitiendo duplicados.")
            return fechas_existentes[0]['id']
    except Exception as e:
        print(f"[!] Error al verificar fechas existentes: {e}")

    # Obtener partidos de la fecha
    url_events = f"{SOFASCORE_BASE_URL}/unique-tournament/{UNIQUE_TOURNAMENT_ID}/season/{SEASON_ID}/events/round/{numero_fecha}"
    res_ev = requests.get(url_events, headers=HEADERS_RAPIDAPI, timeout=10)
    events = res_ev.json().get("events", [])
    if not events:
        print(f"[!] No se encontraron eventos para la fecha {numero_fecha}")
        return None

    events_ordenados = sorted(events, key=lambda x: x.get("startTimestamp", 0))
    primer_timestamp = events_ordenados[0].get("startTimestamp")
    limite_dt = datetime.datetime.fromtimestamp(primer_timestamp, tz=datetime.timezone.utc)
    limite_iso = limite_dt.isoformat()

    fecha_id = str(uuid.uuid4())

    # 1. Crear cabecera
    payload_fecha = {
        "id": fecha_id,
        "numero_fecha": numero_fecha,
        "titulo": f"Fecha {numero_fecha} - Liga Profesional",
        "torneo": "Liga Profesional de Fútbol",
        "limite_pronostico": limite_iso,
        "estado": "abierta"
    }

    try:
        res_f = requests.post(f"{SUPABASE_URL}/rest/v1/prode_fechas", headers=HEADERS_SUPABASE, json=payload_fecha)
        res_f.raise_for_status()
        print(f"✅ Cabecera creada: Fecha {numero_fecha} (ID: {fecha_id})")
    except Exception as e:
        print(f"[!] Error al crear fecha: {e}")
        return None

    # 2. Insertar partidos (primeros 14 encuentros de la fecha)
    payload_partidos = []
    for ev in events[:14]:
        loc = ev.get("homeTeam", {}).get("name", "Local")
        vis = ev.get("awayTeam", {}).get("name", "Visitante")
        venue = (ev.get("venue") or {}).get("name") or "Estadio a confirmar"
        ts = ev.get("startTimestamp", 0)
        horario = formatear_horario_argentino(ts)

        payload_partidos.append({
            "id": str(uuid.uuid4()),
            "fecha_id": fecha_id,
            "local": loc,
            "visitante": vis,
            "escudo_local": ESCUDOS_CLUBES.get(loc, "⚽"),
            "escudo_visitante": ESCUDOS_CLUBES.get(vis, "⚽"),
            "estadio": venue,
            "horario": horario,
            "finalizado": False
        })

    try:
        res_p = requests.post(f"{SUPABASE_URL}/rest/v1/prode_partidos", headers=HEADERS_SUPABASE, json=payload_partidos)
        res_p.raise_for_status()
        print(f"✅ {len(payload_partidos)} partidos publicados con éxito en Supabase.")
        return fecha_id
    except Exception as e:
        print(f"[!] Error al insertar partidos: {e}")
        return None

# ==============================================================================
# 2. LIQUIDAR RESULTADOS Y PUNTOS EN LA APP
# ==============================================================================
def sincronizar_y_liquidar_puntos():
    print("\n[LIQUIDACIÓN] Verificando partidos terminados...")

    try:
        url_f = f"{SUPABASE_URL}/rest/v1/prode_fechas?order=creado_en.desc&limit=1"
        res_f = requests.get(url_f, headers=HEADERS_SUPABASE)
        fechas = res_f.json()
        if not fechas:
            print("[!] No hay fechas creadas en la base de datos.")
            return
        fecha_activa = fechas[0]
        fecha_id = fecha_activa["id"]
        num_fecha = fecha_activa["numero_fecha"]

        url_p = f"{SUPABASE_URL}/rest/v1/prode_partidos?fecha_id=eq.{fecha_id}&finalizado=eq.false"
        res_p = requests.get(url_p, headers=HEADERS_SUPABASE)
        partidos_pendientes = res_p.json()
        if not partidos_pendientes:
            print("Todos los partidos de la fecha actual ya están finalizados.")
            return
    except Exception as e:
        print(f"[!] Error al consultar partidos pendientes en Supabase: {e}")
        return

    # Consultar eventos de la fecha en SofaScore
    url_events = f"{SOFASCORE_BASE_URL}/unique-tournament/{UNIQUE_TOURNAMENT_ID}/season/{SEASON_ID}/events/round/{num_fecha}"
    res_ev = requests.get(url_events, headers=HEADERS_RAPIDAPI, timeout=10)
    events = res_ev.json().get("events", [])

    mapa_events = {}
    for ev in events:
        loc = ev.get("homeTeam", {}).get("name", "").strip().lower()
        vis = ev.get("awayTeam", {}).get("name", "").strip().lower()
        mapa_events[(loc, vis)] = ev

    for p_db in partidos_pendientes:
        clave = (p_db["local"].strip().lower(), p_db["visitante"].strip().lower())
        if clave in mapa_events:
            ev = mapa_events[clave]
            status_type = ev.get("status", {}).get("type")
            status_code = ev.get("status", {}).get("code")

            if status_type == "finished" or status_code == 100:
                gl = ev.get("homeScore", {}).get("display", 0)
                gv = ev.get("awayScore", {}).get("display", 0)
                partido_uuid = p_db["id"]

                print(f"-> Liquidando: {p_db['local']} {gl} - {gv} {p_db['visitante']}")
                try:
                    payload = {
                        "partidoId": partido_uuid,
                        "golesLocal": int(gl),
                        "golesVisitante": int(gv),
                        "finalizado": True
                    }
                    res_app = requests.post(
                        f"{APP_BASE_URL}/api/prode/resultado",
                        headers={"Content-Type": "application/json"},
                        json=payload,
                        timeout=12
                    )
                    res_app.raise_for_status()
                    data = res_app.json()
                    print(f"   🏆 Puntos asignados en la Tribu: {data.get('pronosticosEvaluados', 0)} pronósticos evaluados.")
                except Exception as e:
                    print(f"   [!] Error al notificar al endpoint de la app: {e}")

# ==============================================================================
# 3. SINCRONIZAR TABLA DE POSICIONES EN VIVO
# ==============================================================================
def sincronizar_tabla_posiciones():
    print("\n[ESTADÍSTICAS] Sincronizando Tabla de Posiciones Oficial de la Liga...")
    url_stand = f"{SOFASCORE_BASE_URL}/unique-tournament/{UNIQUE_TOURNAMENT_ID}/season/{SEASON_ID}/standings/total"
    res = requests.get(url_stand, headers=HEADERS_RAPIDAPI, timeout=10)
    if res.status_code != 200:
        print(f"[!] Error al obtener tabla: {res.status_code}")
        return

    st = res.json()
    rows = st.get("standings", [{}])[0].get("rows", [])
    tabla_formateada = []

    for row in rows:
        t_name = row["team"]["name"]
        tabla_formateada.append({
            "rank": row["position"],
            "team": t_name,
            "badge": ESCUDOS_CLUBES.get(t_name, "⚽"),
            "points": row["points"],
            "played": row["matches"],
            "win": row["wins"],
            "draw": row["draws"],
            "lose": row["losses"],
            "diff": str(row.get("scoreDiffFormatted", "0"))
        })

    # Guardar directo en Supabase prode_liga_datos
    try:
        res_sb = requests.post(
            f"{SUPABASE_URL}/rest/v1/prode_liga_datos",
            headers=HEADERS_SUPABASE,
            json={"id": "standings", "payload": tabla_formateada}
        )
        print(f"✅ Tabla de Posiciones sincronizada en Triboo ({len(tabla_formateada)} clubes de Primera).")
    except Exception as e:
        print(f"[!] Error al guardar tabla en Supabase: {e}")

# ==============================================================================
# ENRUTADOR SEGÚN EL DÍA DE LA SEMANA
# ==============================================================================
def ejecutar():
    dia = datetime.date.today().weekday()
    if dia == 4:  # Viernes
        print("=== EJECUCIÓN VIERNES: Publicación de Fixture ===")
        publicar_fixture_automatico()
    elif dia in [5, 6]:  # Fin de semana: Liquidación de partidos en vivo
        print(f"=== EJECUCIÓN FIN DE SEMANA ({'Sábado' if dia == 5 else 'Domingo'}) ===")
        sincronizar_y_liquidar_puntos()
    elif dia == 0:  # Lunes: Liquidación final + actualización de tabla
        print("=== EJECUCIÓN LUNES: Cierre y Actualización de Tabla ===")
        sincronizar_y_liquidar_puntos()
        sincronizar_tabla_posiciones()
    else:
        print("=== JORNADA INTERMEDIA: Sincronizando Tabla Oficial ===")
        sincronizar_tabla_posiciones()

if __name__ == "__main__":
    ejecutar()
