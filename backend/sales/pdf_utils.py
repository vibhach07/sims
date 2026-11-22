import io
from decimal import Decimal
from django.core.files.base import ContentFile
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def generate_invoice_pdf_bytes(invoice) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f766e'),
        alignment=0
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )
    bold_style = ParagraphStyle(
        'DocBold',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0f172a')
    )

    story = []

    # 1. Header
    story.append(Paragraph("SIMS RAIPUR — ACADEMIC INSTITUTE", title_style))
    story.append(Paragraph("<b>Tax Invoice (Cum Bill of Supply)</b>", bold_style))
    story.append(Paragraph("SIMS Educational Services Pvt Ltd | Raipur, Chhattisgarh | GSTIN: 22AAAAA0000A1Z5", meta_style))
    story.append(Spacer(1, 15))

    # 2. Invoice & Customer Details
    inv_data = [
        [
            Paragraph(f"<b>Invoice Number:</b> {invoice.invoice_number}<br/><b>Invoice Date:</b> {invoice.issued_at.strftime('%d-%b-%Y')}<br/><b>Order Ref:</b> {invoice.order.order_id}", meta_style),
            Paragraph(f"<b>Billed To:</b> {invoice.billing_name}<br/><b>State:</b> {invoice.state} (Code: {invoice.state_code})<br/><b>GSTIN:</b> {invoice.gstin or 'Unregistered / B2C'}", meta_style)
        ]
    ]
    meta_table = Table(inv_data, colWidths=[260, 260])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # 3. Line Items
    items_header = ['Description / Service', 'SAC Code', 'Taxable Amt', 'CGST', 'SGST', 'IGST', 'Total (₹)']
    items_rows = [items_header]
    items_rows.append([
        Paragraph(invoice.order.item_title or f"Educational Program ({invoice.order.item_type})", meta_style),
        "999293",
        f"₹{invoice.taxable_amount:.2f}",
        f"₹{invoice.cgst_amount:.2f}",
        f"₹{invoice.sgst_amount:.2f}",
        f"₹{invoice.igst_amount:.2f}",
        f"₹{invoice.total_amount:.2f}"
    ])

    items_table = Table(items_rows, colWidths=[180, 50, 60, 55, 55, 55, 65])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f766e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0, 1), (-1, -1), 6),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 15))

    # 4. Summary & Declaration
    summary_data = [
        [
            Paragraph("<b>Terms & Conditions:</b><br/>1. Computer-generated tax invoice. No physical signature required.<br/>2. Supply of educational coaching services.", meta_style),
            Paragraph(f"<b>Taxable Value:</b> ₹{invoice.taxable_amount:.2f}<br/><b>Total GST:</b> ₹{(invoice.cgst_amount + invoice.sgst_amount + invoice.igst_amount):.2f}<br/><b>Invoice Grand Total:</b> ₹{invoice.total_amount:.2f}", bold_style)
        ]
    ]
    summary_table = Table(summary_data, colWidths=[300, 220])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_table)

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
