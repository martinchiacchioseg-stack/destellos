import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

def build_pdf():
    base_dir = r"C:\Users\marti\.gemini\antigravity\scratch\destellos"
    pdf_path = os.path.join(base_dir, "public", "MANUAL_DE_JUEGOS_TRIBOO.pdf")
    logo_triboo = os.path.join(base_dir, "public", "logos", "triboo-logo.jpg")
    logo_rolfi = os.path.join(base_dir, "public", "logos", "rolf.jpg")

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=1.5*cm,
        rightMargin=1.5*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_CENTER
    )
    tagline_style = ParagraphStyle(
        'Tagline',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#ea580c"),
        alignment=TA_CENTER,
        spaceAfter=4
    )
    sub_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#64748b"),
        alignment=TA_CENTER
    )
    caption_style = ParagraphStyle(
        'Caption',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#64748b"),
        alignment=TA_CENTER
    )
    intro_title_style = ParagraphStyle(
        'IntroTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#c2410c")
    )
    intro_text_style = ParagraphStyle(
        'IntroText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor("#431407")
    )
    sec_title_style = ParagraphStyle(
        'SecTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0f172a")
    )
    sec_badge_style = ParagraphStyle(
        'SecBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#c2410c"),
        alignment=TA_RIGHT
    )
    sec_lead_style = ParagraphStyle(
        'SecLead',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#475569")
    )
    table_key_style = ParagraphStyle(
        'TableKey',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0f172a")
    )
    table_val_style = ParagraphStyle(
        'TableVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#334155")
    )

    story = []

    # 1. Header with Logos
    rolfi_img = Image(logo_rolfi, width=1.1*inch, height=1.1*inch) if os.path.exists(logo_rolfi) else Paragraph("Rolfi", caption_style)
    triboo_img = Image(logo_triboo, width=1.1*inch, height=1.1*inch) if os.path.exists(logo_triboo) else Paragraph("Triboo", caption_style)

    rolfi_box = [rolfi_img, Spacer(1, 4), Paragraph("ROLFI ARLEQUÍN<br/><font size=7 color='#94a3b8'>Anfitrión IA</font>", caption_style)]
    title_box = [
        Paragraph("GUÍA MAESTRA Y REGLAMENTO", tagline_style),
        Paragraph("TRIBOO 🌟 MANUAL OFICIAL DE JUEGOS", title_title_style if 'title_title_style' in locals() else title_style),
        Spacer(1, 3),
        Paragraph("Reglas, mecánicas, horarios, puntajes y secretos de cada juego.", sub_style)
    ]
    triboo_box = [triboo_img, Spacer(1, 4), Paragraph("TRIBOO 🌟<br/><font size=7 color='#94a3b8'>Espacio Privado</font>", caption_style)]

    header_table = Table([[rolfi_box, title_box, triboo_box]], colWidths=[1.3*inch, 4.4*inch, 1.3*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (0,0), 'CENTER'),
        ('ALIGN', (1,0), (1,0), 'CENTER'),
        ('ALIGN', (2,0), (2,0), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#ea580c"), spaceAfter=10))

    # 2. Intro Box
    intro_content = [
        [Paragraph("🌟 BIENVENIDOS A LA TRIBU — Conexión, Juego y Memoria Emotiva", intro_title_style)],
        [Paragraph(
            "TRIBOO es un oasis digital privado para tu familia o grupo de amigos, conducido por <b>Rolfi</b> (el Arlequín anfitrión con Inteligencia Artificial). "
            "Cada juego está pensado para activar el humor sano, la participación genuina y los lazos diarios sin invadir tu tiempo ni llenar tu teléfono de notificaciones caóticas.",
            intro_text_style
        )]
    ]
    intro_table = Table(intro_content, colWidths=[7.0*inch])
    intro_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fdba74")),
        ('LINEBEFORE', (0,0), (0,-1), 4, colors.HexColor("#ea580c")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(intro_table)
    story.append(Spacer(1, 12))

    def make_game_block(title, badge_txt, lead_txt, data, header_bg, border_color):
        t_header = Table([[
            Paragraph(title, sec_title_style),
            Paragraph(f"<b>{badge_txt}</b>", sec_badge_style)
        ]], colWidths=[5.2*inch, 1.8*inch])
        t_header.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(header_bg)),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))

        t_lead = Table([[Paragraph(lead_txt, sec_lead_style)]], colWidths=[7.0*inch])
        t_lead.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ]))

        rows = []
        for k, v in data:
            rows.append([Paragraph(k, table_key_style), Paragraph(v, table_val_style)])

        t_body = Table(rows, colWidths=[2.1*inch, 4.9*inch])
        t_body.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.HexColor("#f1f5f9")),
            ('LINEAFTER', (0,0), (0,-1), 0.5, colors.HexColor("#f1f5f9")),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#f8fafc")),
        ]))

        outer = Table([[t_header], [t_lead], [t_body]], colWidths=[7.0*inch])
        outer.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor(border_color)),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        return KeepTogether([outer, Spacer(1, 10)])

    # Game 1: Flash Grupal
    story.append(make_game_block(
        "📸 1. FLASH GRUPAL: FOTOS A CIEGAS",
        "CORE OBLIGATORIO",
        "El ritual diario de la Tribu. Cada miembro comparte qué está haciendo hoy sin poses artificiales.",
        [
            ("Mecánica 'A Ciegas'", "Durante el día nadie ve las fotos de los demás hasta haber compartido la suya propia. Elimina la vergüenza y asegura participación espontánea."),
            ("Ventana Horaria", "De 00:00 a 22:00 hs (configurable por el admin). A las 22:00 hs el baúl se cierra y se develan los momentos compartidos."),
            ("Veredicto de Rolfi", "Rolfi redacta una devolución cariñosa con humor, nombra la 'Foto Destacada del Día' y genera un diploma digital."),
            ("Puntos y Premios", "• +10 Pts por subir tu foto.<br/>• +15 Pts adicionales a la foto ganadora del diploma.<br/>• +1 Pt por cada reacción o comentario a tus compañeros."),
            ("Regla de Oro", "Fotos 100% auténticas del momento. No valen fotos de archivo de hace 5 años.")
        ],
        "#fff7ed", "#fdba74"
    ))

    # Game 2: El Impostor Asíncrono
    story.append(make_game_block(
        "🕵️ 2. EL IMPOSTOR ASÍNCRONO",
        "DEDUCCIÓN SOCIAL",
        "Juego diario donde nadie sabe quién es quién hasta que caen las máscaras.",
        [
            ("Asignación Secreta<br/><font size=7 color='#64748b'>00:00 a 19:00 hs</font>", "Rolfi elige una palabra secreta (ej: 'Mate'). Los Inocentes reciben la palabra real; el Impostor recibe '¡SOS EL IMPOSTOR!' y una pista de categoría general."),
            ("Pistas a Ciegas<br/><font size=7 color='#64748b'>Fase 1</font>", "Cada jugador escribe una pista breve de 1 a 4 palabras. Las pistas quedan ocultas hasta las 19:00 hs, impidiendo que el impostor copie."),
            ("Revelación y Debate<br/><font size=7 color='#64748b'>19:00 a 22:00 hs</font>", "Se destapan todas las pistas en el muro público. Se abre el debate por chat: ¿Quién puso una pista extraña o fuera de lugar?"),
            ("Votación y Tiro de Gracia", "Cada miembro vota en secreto al sospechoso. Si el Impostor es descubierto, tiene un Tiro de Gracia: si adivina la palabra secreta, ¡gana él!"),
            ("Puntos en Juego", "• Inocentes ganan: +25 Pts c/u (+10 extra a quienes votaron al Impostor).<br/>• Impostor no descubierto: +40 Pts.<br/>• Impostor acierta Tiro de Gracia: +30 Pts.")
        ],
        "#f0fdf4", "#86efac"
    ))

    # Game 3: El Prode
    story.append(make_game_block(
        "⚽ 3. EL PRODE DE FÚTBOL (LIGA AFA)",
        "FÚTBOL EN VIVO",
        "Pronósticos fecha a fecha con resultados en vivo de SofaScore / SportAPI7 y tabla de posiciones oficial.",
        [
            ("Cómo Pronosticar", "Para cada partido elegís Local (L), Empate (E) o Visitante (V), y arriesgás los goles exactos (ej: 2 - 1). Se puede pronosticar hasta 5 min antes del pitazo inicial."),
            ("Sistema de Puntos", "• +3 Pts por acertar tendencia (ganador o empate).<br/>• +2 Pts extra por acertar resultado exacto de goles.<br/>• Total máximo por partido: 5 Puntos."),
            ("En Vivo y Tabla", "La sincronización oficial toma goles al instante. En la pestaña 'Tabla AFA' ves posiciones y goleadores del fútbol argentino en tiempo real.")
        ],
        "#f0f9ff", "#7dd3fc"
    ))

    # Game 4: El Picado
    story.append(make_game_block(
        "🏃‍♂️ 4. EL PICADO DE LA SEMANA",
        "ORGANIZADOR DEPORTIVO",
        "Convocatoria de fútbol 5/8/11 sin desorden de chats. Titulares, suplentes y logística de tercer tiempo.",
        [
            ("Lista Automática", "10 titulares entran directo a la cancha. A partir del jugador 11 entran al banco de suplentes. Si un titular se baja, el suplente asciende solo."),
            ("Equipos y Votación", "Rolfi puede balancear los equipos (Blancas vs Negras). Al terminar el partido se vota a la Figura de la Cancha (+10 Pts) y al Tronco de la fecha.")
        ],
        "#faf5ff", "#d8b4fe"
    ))

    # Game 5: Satélites
    story.append(make_game_block(
        "🧠 5. TRIVIA DIARIA, TRAZO LOCO Y TARAREO ARDILLA",
        "JUEGOS SATÉLITE",
        "Diversión rápida de ingenio, adivinanzas visuales y música.",
        [
            ("🧠 Trivia Diaria (Cerebro Fuga)", "3 preguntas diarias de ingenio y cultura argentina generadas por IA. +5 Puntos por respuesta correcta."),
            ("🎨 Trazo Loco (Pictionary)", "Uno dibuja en el lienzo táctil y los demás adivinan en el chat en tiempo real. +15 Pts al primer acierto."),
            ("🐿️ Tarareo Ardilla", "Rolfi desafía con un tema musical acelerado o tarareado con voz de ardilla para adivinar el tema.")
        ],
        "#fffbeb", "#fde68a"
    ))

    # Superadmin info box
    admin_content = [
        [Paragraph("⚙️ CÓMO GESTIONAR LOS JUEGOS EN SUPERADMIN (/superadmin)", intro_title_style)],
        [Paragraph(
            "En el panel de Superadmin podés encender o apagar cualquiera de estos juegos de forma 100% optativa para cada familia o grupo de amigos. "
            "Cada tribu tiene su propio ritmo y perfil: podés activar solo fotos y trivia, o sumar Prode, Picado y El Impostor según los gustos de tu comunidad.",
            intro_text_style
        )]
    ]
    admin_table = Table(admin_content, colWidths=[7.0*inch])
    admin_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('LINEBEFORE', (0,0), (0,-1), 4, colors.HexColor("#0f172a")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(admin_table)

    doc.build(story)
    print(f"PDF built successfully at: {pdf_path}")

if __name__ == "__main__":
    build_pdf()
